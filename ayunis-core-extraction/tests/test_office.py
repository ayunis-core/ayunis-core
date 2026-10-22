import threading
import zipfile
from pathlib import Path

import httpx
import pytest

from app.api.models import JobFailure
from app.config import Settings
from app.convert import gotenberg
from app.errors import ServiceError
from app.jobs import abortable
from app.jobs.extractors import detect_type
from app.jobs.pipeline import run_job
from app.jobs.runtime import JobInterruptedError
from app.jobs.store import JobStore
from app.result import ExtractionResult
from tests.conftest import FIXTURES, InMemoryObjectStore, make_context, start_request

OFFICE = FIXTURES / "office"
PREFIX = start_request().output.key_prefix
DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def fake_gotenberg(monkeypatch: pytest.MonkeyPatch, pdf: bytes) -> list[httpx.Request]:
    requests: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, content=pdf)

    monkeypatch.setattr(
        gotenberg,
        "default_client",
        lambda url, timeout: httpx.Client(base_url=url, transport=httpx.MockTransport(respond)),
    )
    return requests


def office_settings(settings: Settings, **overrides: object) -> Settings:
    return settings.model_copy(update={"gotenberg_url": "http://gotenberg:3000", **overrides})


def stage_office(objects: InMemoryObjectStore, name: str) -> str:
    return objects.put(f"org/processing/src/{name}", (OFFICE / name).read_bytes())


def result_of(objects: InMemoryObjectStore) -> ExtractionResult:
    return ExtractionResult.model_validate_json(objects.objects[("ayunis", f"{PREFIX}result.json")])


def test_office_input_is_converted_then_extracted_like_a_pdf(
    store: JobStore,
    objects: InMemoryObjectStore,
    settings: Settings,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requests = fake_gotenberg(monkeypatch, (FIXTURES / "pdf" / "born-digital.pdf").read_bytes())
    sha256 = stage_office(objects, "letter.docx")
    context = make_context(
        store,
        objects,
        office_settings(settings),
        tmp_path,
        start_request(
            key="org/processing/src/letter.docx",
            sha256=sha256,
            file_name="Vorlage.docx",
            declared_mime_type=DOCX_MIME,
        ),
    )

    run_job(context)

    status = store.status(context.job_id)
    assert status is not None and status.state == "succeeded"
    result = result_of(objects)
    assert result.document.detected_type == "docx"
    assert result.document.converter == "gotenberg-libreoffice"
    assert result.document.page_count == 3
    assert result.document.timings.conversion_ms >= 0
    assert [page.method for page in result.pages] == ["text", "text", "text"]
    assert b'filename="Vorlage.docx"' in requests[0].read()
    assert objects.objects[("ayunis", f"{PREFIX}converted.pdf")].startswith(b"%PDF")


def test_a_later_attempt_reuses_the_stored_pdf_instead_of_converting_again(
    store: JobStore,
    objects: InMemoryObjectStore,
    settings: Settings,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requests = fake_gotenberg(monkeypatch, (FIXTURES / "pdf" / "born-digital.pdf").read_bytes())
    sha256 = stage_office(objects, "letter.odt")
    request = start_request(
        key="org/processing/src/letter.odt",
        sha256=sha256,
        file_name="letter.odt",
        declared_mime_type="application/vnd.oasis.opendocument.text",
    )
    first = make_context(store, objects, office_settings(settings), tmp_path / "1", request)
    first.store.fail(
        first.job_id,
        _failure("OCR_UNAVAILABLE"),
        first.settings.replica_id,
        first.settings.record_ttl_seconds,
    )
    first.store.release_lease(first.job_id, first.settings.replica_id)
    objects.put(f"{PREFIX}converted.pdf", (FIXTURES / "pdf" / "rotated.pdf").read_bytes())

    second = make_context(store, objects, office_settings(settings), tmp_path / "2", request)
    run_job(second)

    assert requests == []
    result = result_of(objects)
    assert result.document.page_count == 1
    assert result.document.converter == "gotenberg-libreoffice"
    assert result.document.timings.conversion_ms == 0


def test_office_input_fails_when_no_converter_is_configured(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    sha256 = stage_office(objects, "slides.pptx")
    context = make_context(
        store,
        objects,
        settings,
        tmp_path,
        start_request(key="org/processing/src/slides.pptx", sha256=sha256),
    )

    with pytest.raises(ServiceError) as failure:
        run_job(context)

    assert failure.value.code == "CONVERSION_UNAVAILABLE"
    assert failure.value.retryable is True
    assert failure.value.details == {"reason": "not_configured"}


def test_a_gotenberg_rejection_fails_the_document(
    store: JobStore,
    objects: InMemoryObjectStore,
    settings: Settings,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        gotenberg,
        "default_client",
        lambda url, timeout: httpx.Client(
            base_url=url,
            transport=httpx.MockTransport(lambda request: httpx.Response(400, text="bad")),
        ),
    )
    sha256 = stage_office(objects, "letter.rtf")
    context = make_context(
        store,
        objects,
        office_settings(settings),
        tmp_path,
        start_request(key="org/processing/src/letter.rtf", sha256=sha256, file_name="letter.rtf"),
    )

    with pytest.raises(ServiceError) as failure:
        run_job(context)

    assert failure.value.code == "UNPROCESSABLE_DOCUMENT"
    assert failure.value.retryable is False


def test_spreadsheets_and_other_archives_are_unsupported(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    workbook = tmp_path / "book.xlsx"
    with zipfile.ZipFile(workbook, "w") as archive:
        archive.writestr("[Content_Types].xml", "<Types/>")
        archive.writestr("xl/workbook.xml", "<workbook/>")
    sha256 = objects.put("org/processing/src/book.xlsx", workbook.read_bytes())
    context = make_context(
        store,
        objects,
        office_settings(settings),
        tmp_path,
        start_request(key="org/processing/src/book.xlsx", sha256=sha256, file_name="book.xlsx"),
    )

    with pytest.raises(ServiceError) as failure:
        run_job(context)

    assert failure.value.code == "UNSUPPORTED_TYPE"
    assert "xlsx" in failure.value.message


def test_cancel_during_conversion_interrupts_the_job(
    store: JobStore,
    objects: InMemoryObjectStore,
    settings: Settings,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    started = threading.Event()
    release = threading.Event()

    def slow(request: httpx.Request) -> httpx.Response:
        started.set()
        release.wait(5)
        return httpx.Response(200, content=(FIXTURES / "pdf" / "born-digital.pdf").read_bytes())

    monkeypatch.setattr(
        gotenberg,
        "default_client",
        lambda url, timeout: httpx.Client(base_url=url, transport=httpx.MockTransport(slow)),
    )
    monkeypatch.setattr(abortable, "CALL_POLL_SECONDS", 0.05)
    monkeypatch.setattr(abortable, "ABORT_GRACE_SECONDS", 0.2)
    sha256 = stage_office(objects, "letter.docx")
    context = make_context(
        store,
        objects,
        office_settings(settings),
        tmp_path,
        start_request(key="org/processing/src/letter.docx", sha256=sha256, file_name="a.docx"),
    )
    errors: list[BaseException] = []

    def guarded() -> None:
        try:
            run_job(context)
        except BaseException as error:
            errors.append(error)

    worker = threading.Thread(target=guarded)
    worker.start()
    assert started.wait(5)
    store.cancel(context.job_id)
    worker.join(5)
    release.set()
    worker.join(5)

    assert not worker.is_alive()
    assert isinstance(errors[0], JobInterruptedError)
    assert errors[0].reason == "cancelled"
    assert ("ayunis", f"{PREFIX}converted.pdf") not in objects.objects


def _failure(code: str) -> JobFailure:
    return JobFailure(code=code, message=code, retryable=True)


def test_a_stored_pdf_over_the_budget_is_removed_instead_of_reused(
    store: JobStore,
    objects: InMemoryObjectStore,
    settings: Settings,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requests = fake_gotenberg(monkeypatch, (FIXTURES / "pdf" / "born-digital.pdf").read_bytes())
    sha256 = stage_office(objects, "letter.docx")
    objects.put(f"{PREFIX}converted.pdf", b"%PDF" + b"0" * 200_000)
    context = make_context(
        store,
        objects,
        office_settings(settings, max_input_bytes=100_000),
        tmp_path,
        start_request(key="org/processing/src/letter.docx", sha256=sha256, file_name="a.docx"),
    )

    with pytest.raises(ServiceError) as failure:
        run_job(context)

    assert failure.value.code == "INPUT_TOO_LARGE"
    assert ("ayunis", f"{PREFIX}converted.pdf") not in objects.objects
    assert requests == []


def test_zip_detection_never_expands_a_crafted_archive(tmp_path: Path) -> None:
    bomb = tmp_path / "bomb.odt"
    with zipfile.ZipFile(bomb, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("mimetype", b"0" * (50 * 1024 * 1024))
        archive.writestr("content.xml", "<x/>")
    crowded = tmp_path / "crowded.docx"
    with zipfile.ZipFile(crowded, "w") as archive:
        for index in range(20_001):
            archive.writestr(f"word/{index}", b"")

    assert bomb.stat().st_size < 1024 * 1024
    assert detect_type(bomb) == "unknown"
    assert detect_type(crowded) == "unknown"
