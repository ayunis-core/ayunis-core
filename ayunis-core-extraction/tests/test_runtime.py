import threading
import time
from datetime import UTC, datetime, timedelta

from redis.exceptions import ConnectionError

from app.api.models import JobProgress, ResultRef
from app.config import Settings
from app.errors import ServiceError
from app.jobs.runtime import Janitor, JobContext, WorkerPool
from app.jobs.service import JobService
from app.jobs.store import JobStore, job_key
from tests.conftest import InMemoryObjectStore, start_request


def wait_for(predicate: object, timeout: float = 5.0) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():  # type: ignore[operator]
            return
        time.sleep(0.02)
    raise AssertionError("condition not met in time")


def test_worker_pool_runs_a_queued_job_to_succeeded(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings
) -> None:
    result = ResultRef(bucket="ayunis", key="k/result.json", bytes=1, sha256="a" * 64, page_count=1)

    def pipeline(context: JobContext) -> None:
        context.set_phase("extracting")
        context.report_progress(JobProgress(pages_total=1, pages_done=1, pages_text=1))
        assert store.succeed(
            context.job_id, result, settings.replica_id, settings.record_ttl_seconds
        )

    pool = WorkerPool(store, objects, settings, pipeline)
    created = store.start(start_request())
    pool.start()
    try:
        wait_for(lambda: (store.state(created.job_id)) == "succeeded")
    finally:
        pool.stop()
    status = store.status(created.job_id)
    assert status is not None
    assert status.result == result
    assert status.progress.pages_done == 1
    assert store.renew_lease(created.job_id, settings.replica_id) is False


def test_service_error_in_the_pipeline_fails_the_job(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings
) -> None:
    def pipeline(context: JobContext) -> None:
        raise ServiceError("UNPROCESSABLE_DOCUMENT", "corrupt", details={"reason": "x"})

    pool = WorkerPool(store, objects, settings, pipeline)
    created = store.start(start_request())
    pool.start()
    try:
        wait_for(lambda: store.state(created.job_id) == "failed")
    finally:
        pool.stop()
    status = store.status(created.job_id)
    assert status is not None
    assert status.error is not None
    assert status.error.model_dump(by_alias=True) == {
        "code": "UNPROCESSABLE_DOCUMENT",
        "message": "corrupt",
        "retryable": False,
        "details": {"reason": "x"},
    }


def test_unexpected_exception_becomes_internal(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings
) -> None:
    def pipeline(context: JobContext) -> None:
        raise RuntimeError("boom")

    pool = WorkerPool(store, objects, settings, pipeline)
    created = store.start(start_request())
    pool.start()
    try:
        wait_for(lambda: store.state(created.job_id) == "failed")
    finally:
        pool.stop()
    status = store.status(created.job_id)
    assert status is not None
    assert status.error is not None
    assert status.error.code == "INTERNAL"


def test_shutdown_yields_the_running_job_back_to_the_queue(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings
) -> None:
    entered = threading.Event()

    def pipeline(context: JobContext) -> None:
        entered.set()
        while True:
            context.check()
            time.sleep(0.02)

    pool = WorkerPool(store, objects, settings, pipeline)
    created = store.start(start_request())
    pool.start()
    assert entered.wait(5)
    pool.stop()

    status = store.status(created.job_id)
    assert status is not None
    assert (status.state, status.restarts) == ("queued", 0)
    assert store.pop_queued(1) == created.job_id


def test_cancel_during_a_run_interrupts_without_a_result(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings
) -> None:
    entered = threading.Event()
    finished = threading.Event()

    def pipeline(context: JobContext) -> None:
        entered.set()
        try:
            while True:
                context.check()
                time.sleep(0.02)
        finally:
            finished.set()

    pool = WorkerPool(store, objects, settings, pipeline)
    created = store.start(start_request())
    pool.start()
    try:
        assert entered.wait(5)
        store.cancel(created.job_id)
        assert finished.wait(5)
    finally:
        pool.stop()
    assert store.state(created.job_id) == "cancelled"


def test_job_timeout_fails_retryably(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings
) -> None:
    settings = settings.model_copy(update={"max_job_seconds": 0.05})

    def pipeline(context: JobContext) -> None:
        time.sleep(0.1)
        context.check()

    pool = WorkerPool(store, objects, settings, pipeline)
    created = store.start(start_request())
    pool.start()
    try:
        wait_for(lambda: store.state(created.job_id) == "failed")
    finally:
        pool.stop()
    status = store.status(created.job_id)
    assert status is not None
    assert status.error is not None
    assert (status.error.code, status.error.retryable) == ("JOB_TIMEOUT", True)


def test_renewal_errors_past_the_lease_ttl_mark_the_lease_lost(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings
) -> None:
    settings = settings.model_copy(update={"lease_ttl_seconds": 1, "lease_renew_seconds": 0.05})
    entered = threading.Event()
    finished = threading.Event()

    def pipeline(context: JobContext) -> None:
        entered.set()
        try:
            while True:
                context.check()
                time.sleep(0.02)
        finally:
            finished.set()

    class FlakyStore(JobStore):
        def renew_lease(self, job_id: str, replica: str) -> bool:
            raise ConnectionError("redis gone")

    flaky = FlakyStore(store.redis, settings.lease_ttl_seconds)
    pool = WorkerPool(flaky, objects, settings, pipeline)
    created = flaky.start(start_request())
    pool.start()
    try:
        assert entered.wait(5)
        assert finished.wait(5)
    finally:
        pool.stop()
    assert flaky.state(created.job_id) == "running"


def test_janitor_requeues_an_expired_lease_then_fails_at_the_restart_limit(
    store: JobStore, service: JobService, settings: Settings
) -> None:
    janitor = Janitor(store, service, settings)
    created = store.start(start_request())
    store.pop_queued(1)

    for expected_restarts in (1, 2):
        store.claim(created.job_id, "dead-replica")
        store.release_lease(created.job_id, "dead-replica")
        janitor.sweep()
        status = store.status(created.job_id)
        assert status is not None
        assert (status.state, status.restarts) == ("queued", expected_restarts)
        assert store.pop_queued(1) == created.job_id

    store.claim(created.job_id, "dead-replica")
    store.release_lease(created.job_id, "dead-replica")
    janitor.sweep()
    status = store.status(created.job_id)
    assert status is not None
    assert status.state == "failed"
    assert status.error is not None
    assert status.error.code == "RESTART_LIMIT"


def test_janitor_requeues_a_stranded_queued_job(
    store: JobStore, service: JobService, settings: Settings, redis_client: object
) -> None:
    janitor = Janitor(store, service, settings)
    created = store.start(start_request())
    store.pop_queued(1)
    stale = (datetime.now(UTC) - timedelta(seconds=settings.lease_ttl_seconds + 1)).isoformat()
    store.redis.hset(job_key(created.job_id), "updatedAt", stale.replace("+00:00", "Z"))

    janitor.sweep()

    assert store.pop_queued(1) == created.job_id


def test_janitor_releases_orphans_and_expired_records(
    store: JobStore, service: JobService, settings: Settings, objects: InMemoryObjectStore
) -> None:
    janitor = Janitor(store, service, settings)
    orphan = store.start(start_request())
    objects.put(f"{start_request().output.key_prefix}pages/00000.json", b"{}")
    old = (datetime.now(UTC) - timedelta(seconds=settings.orphan_after_seconds + 1)).isoformat()
    store.redis.hset(job_key(orphan.job_id), "lastPolledAt", old.replace("+00:00", "Z"))
    finished = store.start(start_request(source_id="f0000000-0000-0000-0000-000000000002"))
    store.claim(finished.job_id, "r1")
    store.succeed(
        finished.job_id,
        ResultRef(bucket="ayunis", key="k", bytes=1, sha256="a" * 64, page_count=1),
        "r1",
        settings.record_ttl_seconds,
    )
    expired = (datetime.now(UTC) - timedelta(seconds=settings.record_ttl_seconds + 1)).isoformat()
    store.redis.hset(job_key(finished.job_id), "finishedAt", expired.replace("+00:00", "Z"))

    janitor.sweep()

    assert store.status(orphan.job_id) is None
    assert store.status(finished.job_id) is None
    assert objects.objects == {}
    assert store.all_job_ids() == []
