import json
import threading
from pathlib import Path

import pytest

from app.api.models import JobProgress
from app.config import Settings
from app.errors import ServiceError
from app.jobs.pipeline import run_job
from app.jobs.runtime import JobContext, JobInterruptedError
from app.jobs.store import JobStore
from app.result import ExtractionResult, PageEntry, strip_nul
from tests.conftest import FIXTURES, InMemoryObjectStore, start_request

PDFS = FIXTURES / "pdf"
PREFIX = start_request().output.key_prefix


def stage(objects: InMemoryObjectStore, name: str) -> str:
    return objects.put("org/processing/src/report.pdf", (PDFS / name).read_bytes())


def make_context(
    store: JobStore,
    objects: InMemoryObjectStore,
    settings: Settings,
    tmp_path: Path,
    sha256: str,
    max_pages: int | None = None,
    ocr: str = "auto",
) -> JobContext:
    created = store.start(start_request(sha256=sha256, max_pages=max_pages, ocr=ocr))
    store.pop_queued(1)
    assert store.claim(created.job_id, settings.replica_id) == "claimed"
    record = store.get(created.job_id)
    assert record is not None
    scratch = tmp_path / "scratch"
    scratch.mkdir(parents=True, exist_ok=True)
    return JobContext(record, store, objects, settings, scratch, threading.Event())


def result_of(objects: InMemoryObjectStore) -> ExtractionResult:
    raw = objects.objects[("ayunis", f"{PREFIX}result.json")]
    return ExtractionResult.model_validate_json(raw)


def test_born_digital_pdf_extracts_from_the_text_layer(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    context = make_context(store, objects, settings, tmp_path, stage(objects, "born-digital.pdf"))

    run_job(context)

    status = store.status(context.job_id)
    assert status is not None
    assert status.state == "succeeded"
    assert status.result is not None
    result = result_of(objects)
    assert status.result.model_dump(by_alias=True) == {
        "bucket": "ayunis",
        "key": f"{PREFIX}result.json",
        "bytes": len(objects.objects[("ayunis", f"{PREFIX}result.json")]),
        "sha256": status.result.sha256,
        "pageCount": 3,
    }
    assert [page.index for page in result.pages] == [0, 1, 2]
    assert [page.number for page in result.pages] == [1, 2, 3]
    assert all(page.method == "text" for page in result.pages)
    assert result.pages[1].text.startswith("Beschlussvorlage 2")
    assert result.document.model_dump(by_alias=True, exclude={"timings"}) == {
        "fileName": "report.pdf",
        "declaredMimeType": "application/pdf",
        "detectedType": "pdf",
        "pageCount": 3,
        "converter": None,
        "ocrModel": None,
        "ruleVersion": "ocr-rule/1",
        "pagesOcr": 0,
        "pagesText": 3,
        "pagesBlank": 0,
        "warnings": [],
    }
    assert result.document.timings.total_ms >= result.document.timings.analysis_ms
    assert status.progress == JobProgress(pages_total=3, pages_done=3, pages_ocr=0, pages_text=3)
    assert sorted(key for (_, key) in objects.objects if "/pages/" in key) == [
        f"{PREFIX}pages/0000{index}.json" for index in range(3)
    ]
    assert ("ayunis", f"{PREFIX}result.json.tmp-1") not in objects.objects


def test_result_json_matches_the_contract_shape(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    context = make_context(store, objects, settings, tmp_path, stage(objects, "mixed.pdf"))

    run_job(context)

    raw = json.loads(objects.objects[("ayunis", f"{PREFIX}result.json")])
    assert raw["schemaVersion"] == 1
    assert raw["jobId"] == context.job_id
    assert raw["idempotencyKey"] == context.request.idempotency_key
    assert set(raw["document"]) == {
        "fileName",
        "declaredMimeType",
        "detectedType",
        "pageCount",
        "converter",
        "ocrModel",
        "ruleVersion",
        "pagesOcr",
        "pagesText",
        "pagesBlank",
        "warnings",
        "timings",
    }
    assert set(raw["pages"][0]) == {
        "index",
        "number",
        "text",
        "method",
        "ocrReason",
        "quality",
        "size",
        "truncated",
    }
    assert raw["pages"][0]["size"] == {"width": 595.3, "height": 841.9}


def test_a_scanned_page_without_ocr_is_blank_and_an_all_blank_document_is_empty(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    context = make_context(store, objects, settings, tmp_path, stage(objects, "mixed.pdf"))
    run_job(context)
    assert [page.method for page in result_of(objects).pages] == ["text", "blank", "text"]

    objects.objects.clear()
    empty = make_context(
        store, objects, settings, tmp_path / "e", stage(objects, "scan-no-text.pdf")
    )
    with pytest.raises(ServiceError) as error:
        run_job(empty)
    assert error.value.code == "EMPTY_DOCUMENT"


def test_page_limit_is_checked_before_any_page_is_read(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    sha256 = stage(objects, "born-digital.pdf")
    context = make_context(store, objects, settings, tmp_path, sha256, max_pages=2)

    with pytest.raises(ServiceError) as error:
        run_job(context)

    assert error.value.code == "TOO_MANY_PAGES"
    assert error.value.details == {"pageCount": 3, "maxPages": 2}
    assert not [key for (_, key) in objects.objects if "/pages/" in key]


def test_a_restart_resumes_from_the_checkpointed_pages(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    sha256 = stage(objects, "born-digital.pdf")
    for index in (0, 1):
        entry = PageEntry(
            index=index, number=index + 1, text=f"checkpointed {index}", method="text"
        )
        objects.put(
            f"{PREFIX}pages/{index:05d}.json", entry.model_dump_json(by_alias=True).encode()
        )
    objects.put(f"{PREFIX}pages/00002.json", b"not json")
    context = make_context(store, objects, settings, tmp_path, sha256)

    run_job(context)

    result = result_of(objects)
    assert [page.text for page in result.pages[:2]] == ["checkpointed 0", "checkpointed 1"]
    assert result.pages[2].text.startswith("Beschlussvorlage 3")
    assert result.document.pages_text == 3


def test_cancel_between_pages_leaves_no_result(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    settings = settings.model_copy(update={"checkpoint_pages": 1})
    context = make_context(store, objects, settings, tmp_path, stage(objects, "born-digital.pdf"))
    reports: list[JobProgress] = []
    original = context.report_progress

    def cancel_after_first_page(progress: JobProgress) -> None:
        reports.append(progress)
        original(progress)
        if progress.pages_done == 1:
            store.cancel(context.job_id)

    context.report_progress = cancel_after_first_page  # type: ignore[method-assign]

    with pytest.raises(JobInterruptedError) as interrupted:
        run_job(context)

    assert interrupted.value.reason == "cancelled"
    assert ("ayunis", f"{PREFIX}result.json") not in objects.objects
    assert store.state(context.job_id) == "cancelled"


def test_result_is_discarded_when_the_job_was_cancelled_during_the_write(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    context = make_context(store, objects, settings, tmp_path, stage(objects, "born-digital.pdf"))
    original = objects.copy

    def cancel_during_copy(source: object, target: object) -> None:
        original(source, target)  # type: ignore[arg-type]
        store.cancel(context.job_id)

    objects.copy = cancel_during_copy  # type: ignore[method-assign]

    run_job(context)

    assert ("ayunis", f"{PREFIX}result.json") not in objects.objects
    status = store.status(context.job_id)
    assert status is not None
    assert (status.state, status.result) == ("cancelled", None)


def test_page_text_is_capped_with_a_warning_and_a_document_cap_fails(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    capped = settings.model_copy(update={"max_page_chars": 100})
    context = make_context(
        store, objects, capped, tmp_path, stage(objects, "born-digital.pdf"), ocr="never"
    )
    run_job(context)
    result = result_of(objects)
    assert all(len(page.text) == 100 for page in result.pages)
    assert all(page.truncated for page in result.pages)
    assert "page_text_truncated" in result.document.warnings

    # A restart reuses the checkpoints and must still report the cut.
    objects.objects.pop(("ayunis", f"{PREFIX}result.json"))
    store.delete(context.job_id)
    context = make_context(
        store, objects, capped, tmp_path / "r", stage(objects, "born-digital.pdf"), ocr="never"
    )
    run_job(context)
    assert "page_text_truncated" in result_of(objects).document.warnings

    objects.objects.clear()
    store.delete(context.job_id)
    tiny = settings.model_copy(update={"max_document_chars": 5000})
    context = make_context(store, objects, tiny, tmp_path / "d", stage(objects, "born-digital.pdf"))
    with pytest.raises(ServiceError) as error:
        run_job(context)
    assert error.value.code == "UNPROCESSABLE_DOCUMENT"
    assert error.value.details == {"maxDocumentChars": 5000}


def test_a_result_is_kept_when_another_replica_took_the_job_over(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    context = make_context(store, objects, settings, tmp_path, stage(objects, "born-digital.pdf"))
    original = objects.copy

    def lose_the_lease_during_copy(source: object, target: object) -> None:
        original(source, target)  # type: ignore[arg-type]
        store.release_lease(context.job_id, settings.replica_id)
        store.requeue_expired(context.job_id, 2)
        store.pop_queued(1)
        store.claim(context.job_id, "other-replica")

    objects.copy = lose_the_lease_during_copy  # type: ignore[method-assign]

    with pytest.raises(JobInterruptedError):
        run_job(context)

    assert ("ayunis", f"{PREFIX}result.json") in objects.objects
    assert store.state(context.job_id) == "running"


def test_strip_nul_removes_only_nul() -> None:
    assert strip_nul("a\x00b\tc\n") == "ab\tc\n"
