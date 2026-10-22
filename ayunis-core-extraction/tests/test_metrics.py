import logging
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.api.models import EMPTY_PROGRESS, JobFailure, JobStatus, ResultRef
from app.config import Settings
from app.errors import ServiceError
from app.jobs.runtime import JobContext, WorkerPool
from app.jobs.store import JobStore
from app.metrics import REGISTRY, JobMetrics, JobOutcome, MetricsRegistry, classify_outcome
from tests.conftest import InMemoryObjectStore, start_request
from tests.test_runtime import wait_for


def test_registry_counts_outcomes_stages_and_ocr_pages() -> None:
    registry = MetricsRegistry()
    first = JobMetrics(detected_type="pdf", pages_total=4, pages_ocr=2, ocr_pages_sent=2)
    first.record_stage("download", 10)
    first.record_stage("ocr", 900)
    second = JobMetrics(detected_type="docx")
    second.record_stage("download", 30)

    registry.record("j1", first, JobOutcome("succeeded"))
    registry.record("j2", second, JobOutcome("failed_final", "UNPROCESSABLE_DOCUMENT"))
    snapshot = registry.snapshot().model_dump(by_alias=True)

    assert snapshot["jobs"] == {
        "succeeded": 1,
        "failed_retryable": 0,
        "failed_final": 1,
        "cancelled": 0,
        "released": 0,
        "yielded": 0,
    }
    assert snapshot["failuresByCode"] == {"UNPROCESSABLE_DOCUMENT": 1}
    assert snapshot["stages"]["download"] == {"count": 2, "totalMs": 40}
    assert snapshot["stages"]["ocr"] == {"count": 1, "totalMs": 900}
    assert snapshot["ocrPagesSent"] == 2
    assert snapshot["activeJobs"] == 0
    assert snapshot["memory"]["maxRssBytes"] > 0


def test_worker_pool_emits_one_job_event_per_outcome(
    store: JobStore,
    objects: InMemoryObjectStore,
    settings: Settings,
    caplog: pytest.LogCaptureFixture,
) -> None:
    result = ResultRef(bucket="ayunis", key="k/result.json", bytes=1, sha256="a" * 64, page_count=1)

    def pipeline(context: JobContext) -> None:
        context.metrics.detected_type = "pdf"
        context.metrics.record_stage("analysis", 5)
        if context.request.owner.source_id.endswith("1"):
            store.succeed(context.job_id, result, settings.replica_id, settings.record_ttl_seconds)
            return
        raise ServiceError("OCR_UNAVAILABLE", "down", retryable=True)

    before = REGISTRY.snapshot()
    pool = WorkerPool(store, objects, settings, pipeline)
    succeeded = store.start(start_request(source_id="s-1", sha256="1" * 64))
    failed = store.start(start_request(source_id="s-2", sha256="2" * 64))
    with caplog.at_level(logging.INFO, logger="app.metrics"):
        pool.start()
        try:
            wait_for(lambda: store.state(succeeded.job_id) == "succeeded")
            wait_for(lambda: store.state(failed.job_id) == "failed")
            wait_for(lambda: REGISTRY.snapshot().jobs["failed_retryable"] > 0)
        finally:
            pool.stop()

    events = {
        record.__dict__["jobId"]: record.__dict__
        for record in caplog.records
        if record.__dict__.get("event") == "extraction_job"
    }
    assert events[succeeded.job_id]["outcome"] == "succeeded"
    assert events[succeeded.job_id]["code"] is None
    assert events[succeeded.job_id]["detectedType"] == "pdf"
    assert events[succeeded.job_id]["analysisMs"] == 5
    assert events[succeeded.job_id]["totalMs"] >= 0
    assert events[succeeded.job_id]["maxRssBytes"] > 0
    assert events[failed.job_id]["outcome"] == "failed_retryable"
    assert events[failed.job_id]["code"] == "OCR_UNAVAILABLE"
    after = REGISTRY.snapshot()
    assert after.jobs["succeeded"] - before.jobs["succeeded"] == 1
    assert after.jobs["failed_retryable"] - before.jobs["failed_retryable"] == 1
    assert after.active_jobs == 0


def test_metrics_endpoint_serves_the_snapshot(client: TestClient) -> None:
    response = client.get("/metrics")

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {
        "jobs",
        "failuresByCode",
        "stages",
        "ocrPagesSent",
        "activeJobs",
        "memory",
    }
    assert set(body["stages"]) == {"download", "conversion", "analysis", "ocr", "total"}


def test_a_pipeline_that_returns_after_a_cancel_is_counted_as_cancelled(
    store: JobStore,
    objects: InMemoryObjectStore,
    settings: Settings,
    caplog: pytest.LogCaptureFixture,
) -> None:
    def pipeline(context: JobContext) -> None:
        store.cancel(context.job_id)  # the result writer would discard the result and return

    pool = WorkerPool(store, objects, settings, pipeline)
    created = store.start(start_request(source_id="s-3", sha256="3" * 64))
    with caplog.at_level(logging.INFO, logger="app.metrics"):
        pool.start()
        try:
            wait_for(lambda: store.state(created.job_id) == "cancelled")
            wait_for(
                lambda: any(
                    r.__dict__.get("jobId") == created.job_id
                    for r in caplog.records
                    if r.__dict__.get("event") == "extraction_job"
                )
            )
        finally:
            pool.stop()

    event = next(
        r.__dict__
        for r in caplog.records
        if r.__dict__.get("event") == "extraction_job" and r.__dict__["jobId"] == created.job_id
    )
    assert event["outcome"] == "cancelled"


def test_stage_metrics_are_recorded_before_a_job_fails(
    store: JobStore,
    objects: InMemoryObjectStore,
    settings: Settings,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.jobs.pipeline import run_job
    from app.pdf import extractor
    from tests.conftest import FIXTURES, make_context

    class Broken:
        model = "broken"

        def call(self, pdf_bytes: bytes, page_count: int, check: object = None) -> object:
            raise ServiceError("OCR_UNAVAILABLE", "down", retryable=True)

    monkeypatch.setattr(extractor, "resolve_ocr_backend", lambda _settings: Broken())
    sha256 = objects.put(
        "org/processing/src/report.pdf", (FIXTURES / "pdf" / "scan-no-text.pdf").read_bytes()
    )
    context = make_context(store, objects, settings, tmp_path, start_request(sha256=sha256))

    with pytest.raises(ServiceError):
        run_job(context)

    assert context.metrics.pages_total == 2
    assert context.metrics.detected_type == "pdf"
    assert "download" in context.metrics.stages_ms
    assert "analysis" in context.metrics.stages_ms
    assert context.metrics.ocr_pages_sent == 2
    assert context.metrics.pages_ocr == 0


def test_a_page_limit_failure_still_reports_the_page_count(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    from app.jobs.pipeline import run_job
    from tests.conftest import FIXTURES, make_context

    sha256 = objects.put(
        "org/processing/src/report.pdf", (FIXTURES / "pdf" / "born-digital.pdf").read_bytes()
    )
    context = make_context(
        store, objects, settings, tmp_path, start_request(sha256=sha256, max_pages=1)
    )

    with pytest.raises(ServiceError) as failure:
        run_job(context)

    assert failure.value.code == "TOO_MANY_PAGES"
    assert context.metrics.pages_total == 3


def test_a_resumed_job_counts_its_checkpointed_ocr_pages(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    from app.jobs.pipeline import run_job
    from app.result import PageEntry
    from tests.conftest import FIXTURES, make_context

    sha256 = objects.put(
        "org/processing/src/report.pdf", (FIXTURES / "pdf" / "scan-no-text.pdf").read_bytes()
    )
    request = start_request(sha256=sha256)
    prefix = request.output.key_prefix
    for index in range(2):
        entry = PageEntry(index=index, number=index + 1, text="done", method="ocr")
        objects.put(
            f"{prefix}pages/{index:05d}.json", entry.model_dump_json(by_alias=True).encode()
        )
    context = make_context(store, objects, settings, tmp_path, request)

    run_job(context)

    assert context.metrics.pages_ocr == 2
    assert context.metrics.ocr_pages_sent == 0


def test_a_failure_that_loses_the_race_to_a_cancel_is_not_counted_as_failed(
    store: JobStore,
    objects: InMemoryObjectStore,
    settings: Settings,
    caplog: pytest.LogCaptureFixture,
) -> None:
    def pipeline(context: JobContext) -> None:
        store.cancel(context.job_id)
        raise ServiceError("OCR_UNAVAILABLE", "down", retryable=True)

    pool = WorkerPool(store, objects, settings, pipeline)
    created = store.start(start_request(source_id="s-4", sha256="4" * 64))
    with caplog.at_level(logging.INFO, logger="app.metrics"):
        pool.start()
        try:
            wait_for(lambda: _event_for(caplog, created.job_id) is not None)
        finally:
            pool.stop()

    event = _event_for(caplog, created.job_id)
    assert event is not None
    assert (event["outcome"], event["code"]) == ("cancelled", None)
    assert store.state(created.job_id) == "cancelled"


def test_the_job_event_survives_a_store_error_during_cleanup(
    store: JobStore,
    objects: InMemoryObjectStore,
    settings: Settings,
    caplog: pytest.LogCaptureFixture,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from redis.exceptions import ConnectionError

    result = ResultRef(bucket="ayunis", key="k/result.json", bytes=1, sha256="a" * 64, page_count=1)

    def pipeline(context: JobContext) -> None:
        store.succeed(context.job_id, result, settings.replica_id, settings.record_ttl_seconds)

    def broken_release(job_id: str, replica: str) -> None:
        raise ConnectionError("gone")

    monkeypatch.setattr(store, "release_lease", broken_release)
    pool = WorkerPool(store, objects, settings, pipeline)
    created = store.start(start_request(source_id="s-5", sha256="5" * 64))
    before = REGISTRY.snapshot().jobs["succeeded"]
    with caplog.at_level(logging.INFO, logger="app.metrics"):
        pool.start()
        try:
            wait_for(lambda: _event_for(caplog, created.job_id) is not None)
        finally:
            pool.stop()

    event = _event_for(caplog, created.job_id)
    assert event is not None and event["outcome"] == "succeeded"
    assert REGISTRY.snapshot().jobs["succeeded"] == before + 1


def _event_for(caplog: pytest.LogCaptureFixture, job_id: str) -> dict[str, object] | None:
    for record in caplog.records:
        if record.__dict__.get("event") == "extraction_job" and record.__dict__["jobId"] == job_id:
            return dict(record.__dict__)
    return None


def test_a_store_error_while_persisting_a_failure_counts_the_attempt_as_lost(
    store: JobStore,
    objects: InMemoryObjectStore,
    settings: Settings,
    caplog: pytest.LogCaptureFixture,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The handler's store error must neither record `succeeded` nor kill the worker thread."""
    from redis.exceptions import ConnectionError

    real_fail = store.fail
    broken = {"once": True}

    def flaky_fail(*args: object, **kwargs: object) -> bool:
        if broken["once"]:
            broken["once"] = False
            raise ConnectionError("gone")
        return real_fail(*args, **kwargs)  # type: ignore[arg-type]

    monkeypatch.setattr(store, "fail", flaky_fail)

    def pipeline(context: JobContext) -> None:
        raise ServiceError("UNPROCESSABLE_DOCUMENT", "corrupt")

    pool = WorkerPool(
        store, objects, settings.model_copy(update={"max_concurrent_jobs": 1}), pipeline
    )
    first = store.start(start_request(source_id="s-6", sha256="6" * 64))
    with caplog.at_level(logging.INFO, logger="app.metrics"):
        pool.start()
        try:
            wait_for(lambda: _event_for(caplog, first.job_id) is not None)
            second = store.start(start_request(source_id="s-7", sha256="7" * 64))
            wait_for(lambda: store.state(second.job_id) == "failed")
        finally:
            pool.stop()

    event = _event_for(caplog, first.job_id)
    assert event is not None
    assert (event["outcome"], event["code"]) == ("released", "STORE_LOST")
    second_event = _event_for(caplog, second.job_id)
    assert second_event is not None and second_event["outcome"] == "failed_final"


def test_an_interrupted_job_carries_no_failure_code(
    store: JobStore,
    objects: InMemoryObjectStore,
    settings: Settings,
    caplog: pytest.LogCaptureFixture,
) -> None:
    def pipeline(context: JobContext) -> None:
        store.cancel(context.job_id)
        context.check()  # raises JobInterruptedError("cancelled")

    before = dict(REGISTRY.snapshot().failures_by_code)
    pool = WorkerPool(store, objects, settings, pipeline)
    created = store.start(start_request(source_id="s-8", sha256="8" * 64))
    with caplog.at_level(logging.INFO, logger="app.metrics"):
        pool.start()
        try:
            wait_for(lambda: _event_for(caplog, created.job_id) is not None)
        finally:
            pool.stop()

    event = _event_for(caplog, created.job_id)
    assert event is not None
    assert (event["outcome"], event["code"]) == ("cancelled", None)
    assert dict(REGISTRY.snapshot().failures_by_code) == before


def _status(state: str, error: JobFailure | None = None) -> JobStatus:
    return JobStatus(
        job_id="j",
        idempotency_key="k",
        state=state,  # type: ignore[arg-type]
        phase=None,
        attempt=1,
        restarts=0,
        progress=EMPTY_PROGRESS,
        result=None,
        error=error,
        created_at="t",
        started_at=None,
        updated_at="t",
        finished_at=None,
    )


@pytest.mark.parametrize(
    ("status", "lost_store", "expected"),
    [
        (_status("succeeded"), False, JobOutcome("succeeded")),
        (
            _status("failed", JobFailure(code="OCR_UNAVAILABLE", message="m", retryable=True)),
            False,
            JobOutcome("failed_retryable", "OCR_UNAVAILABLE"),
        ),
        (
            _status("failed", JobFailure(code="TOO_MANY_PAGES", message="m", retryable=False)),
            False,
            JobOutcome("failed_final", "TOO_MANY_PAGES"),
        ),
        (_status("failed"), False, JobOutcome("failed_final")),
        (_status("cancelled"), False, JobOutcome("cancelled")),
        (_status("queued"), False, JobOutcome("yielded")),
        (_status("running"), False, JobOutcome("released")),
        (None, False, JobOutcome("released")),
        (_status("succeeded"), True, JobOutcome("released", "STORE_LOST")),
        (None, True, JobOutcome("released", "STORE_LOST")),
    ],
)
def test_classify_outcome_covers_every_terminal_state(
    status: JobStatus | None, lost_store: bool, expected: JobOutcome
) -> None:
    assert classify_outcome(status, lost_store) == expected


def test_a_shutdown_that_finds_the_job_cancelled_counts_as_cancelled(
    store: JobStore,
    objects: InMemoryObjectStore,
    settings: Settings,
    caplog: pytest.LogCaptureFixture,
) -> None:
    from app.jobs.runtime import JobInterruptedError

    def pipeline(context: JobContext) -> None:
        store.cancel(context.job_id)
        raise JobInterruptedError("shutdown")  # the stop check saw the shutdown flag first

    pool = WorkerPool(store, objects, settings, pipeline)
    created = store.start(start_request(source_id="s-9", sha256="9" * 64))
    with caplog.at_level(logging.INFO, logger="app.metrics"):
        pool.start()
        try:
            wait_for(lambda: _event_for(caplog, created.job_id) is not None)
        finally:
            pool.stop()

    event = _event_for(caplog, created.job_id)
    assert event is not None
    assert (event["outcome"], event["code"]) == ("cancelled", None)


def test_email_attachments_record_their_stage_durations(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    from app.jobs.pipeline import run_job
    from tests.conftest import FIXTURES, make_context

    path = FIXTURES / "email" / "with-attachments.eml"
    sha256 = objects.put("org/processing/src/with-attachments.eml", path.read_bytes())
    context = make_context(
        store,
        objects,
        settings,
        tmp_path,
        start_request(
            key="org/processing/src/with-attachments.eml",
            sha256=sha256,
            file_name="with-attachments.eml",
            declared_mime_type="message/rfc822",
        ),
    )

    run_job(context)

    assert {"download", "analysis", "ocr"} <= set(context.metrics.stages_ms)
