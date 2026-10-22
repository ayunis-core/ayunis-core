import json
import threading
from pathlib import Path

import httpx
import pytest

from app.api.models import JobProgress
from app.config import Settings
from app.errors import ServiceError
from app.jobs import abortable
from app.jobs.pipeline import run_job
from app.jobs.runtime import JobContext, JobInterruptedError
from app.jobs.store import JobStore
from app.ocr.backend import resolve_ocr_backend
from app.ocr.batching import iter_batches
from app.ocr.fake import FakeOcrBackend, SimpleOcrCall
from app.ocr.mistral import MistralOcrBackend, MistralOcrCall
from app.pdf import extractor
from app.pdf.document import PdfFile
from app.result import ExtractionResult, PageEntry
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
    ocr: str = "auto",
) -> JobContext:
    created = store.start(start_request(sha256=sha256, ocr=ocr))
    store.pop_queued(1)
    store.claim(created.job_id, settings.replica_id)
    record = store.get(created.job_id)
    assert record is not None
    scratch = tmp_path / "scratch"
    scratch.mkdir(parents=True, exist_ok=True)
    return JobContext(record, store, objects, settings, scratch, threading.Event())


def result_of(objects: InMemoryObjectStore) -> ExtractionResult:
    return ExtractionResult.model_validate_json(objects.objects[("ayunis", f"{PREFIX}result.json")])


def test_backend_resolution_follows_the_settings(tmp_path: Path) -> None:
    assert resolve_ocr_backend(Settings(OCR_BACKEND="fake")) is not None
    assert resolve_ocr_backend(Settings(OCR_BACKEND="mistral")) is None
    real = resolve_ocr_backend(Settings(OCR_BACKEND="mistral", MISTRAL_API_KEY="k"))
    assert isinstance(real, MistralOcrBackend)
    assert real.model == "mistral-ocr-latest"


def test_fake_backend_is_deterministic_and_reads_the_text_layer() -> None:
    backend = FakeOcrBackend()
    pdf_bytes = (PDFS / "born-digital.pdf").read_bytes()

    first = backend.ocr_pdf(pdf_bytes, 3)
    second = backend.ocr_pdf(pdf_bytes, 3)

    assert first == second
    assert len(first) == 3
    assert first[0].startswith("[fake-ocr ")
    assert "page 1/3" in first[0]
    assert "Beschlussvorlage 1" in first[0]
    assert backend.calls == [3, 3]


def test_batches_respect_the_page_cap_and_halve_on_the_byte_cap(tmp_path: Path) -> None:
    with PdfFile(PDFS / "scan-no-text.pdf") as pdf:
        by_pages = [indices for indices, _ in iter_batches(pdf, [0, 1], 1, 10**9, tmp_path)]
        by_bytes = [
            (indices, path.stat().st_size)
            for indices, path in iter_batches(pdf, [1, 0], 20, 250_000, tmp_path)
        ]

    assert by_pages == [[0], [1]]
    assert [indices for indices, _ in by_bytes] == [[0], [1]]
    assert all(size <= 250_000 for _, size in by_bytes)


def test_scanned_pages_are_ocred_in_batches_with_progress_per_batch(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    settings = settings.model_copy(update={"ocr_batch_pages": 1})
    context = make_context(store, objects, settings, tmp_path, stage(objects, "mixed.pdf"))
    reports: list[JobProgress] = []
    original = context.report_progress

    def record(progress: JobProgress) -> None:
        reports.append(progress)
        original(progress)

    context.report_progress = record  # type: ignore[method-assign]

    run_job(context)

    result = result_of(objects)
    assert [page.method for page in result.pages] == ["text", "ocr", "text"]
    assert result.pages[1].text.startswith("[fake-ocr ")
    assert result.pages[1].ocr_reason == "no_text"
    assert result.document.model_dump(
        by_alias=True, include={"ocr_model", "pages_ocr", "pages_text", "pages_blank", "warnings"}
    ) == {
        "ocrModel": "fake-ocr",
        "pagesOcr": 1,
        "pagesText": 2,
        "pagesBlank": 0,
        "warnings": [],
    }
    assert reports[-1] == JobProgress(pages_total=3, pages_done=3, pages_ocr=1, pages_text=2)
    assert any(report.pages_ocr == 1 and report.pages_done == 3 for report in reports)
    status = store.status(context.job_id)
    assert status is not None
    assert status.progress.pages_ocr == 1


def test_an_all_scanned_document_is_ocred_in_page_ranges_and_resumes_after_a_restart(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    settings = settings.model_copy(update={"ocr_batch_pages": 1})
    done = PageEntry(index=0, number=1, text="already ocred", method="ocr", ocr_reason="no_text")
    objects.put(f"{PREFIX}pages/00000.json", done.model_dump_json(by_alias=True).encode())
    fake = FakeOcrBackend()
    context = make_context(store, objects, settings, tmp_path, stage(objects, "scan-no-text.pdf"))

    with pytest.MonkeyPatch.context() as patch:
        patch.setattr(extractor, "resolve_ocr_backend", lambda _settings: fake)
        run_job(context)

    result = result_of(objects)
    assert fake.calls == [1]
    assert result.pages[0].text == "already ocred"
    assert result.pages[1].text.startswith("[fake-ocr ")
    assert result.document.pages_ocr == 2


def test_ocr_never_keeps_the_text_layer_as_fallback(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    sha256 = stage(objects, "poor-ocr-layer.pdf")
    context = make_context(store, objects, settings, tmp_path, sha256, ocr="never")

    run_job(context)

    result = result_of(objects)
    assert [page.method for page in result.pages] == ["text_fallback", "text_fallback"]
    assert [page.ocr_reason for page in result.pages] == ["garbage", "invalid_words"]
    assert result.pages[0].text.startswith("D")
    assert result.document.warnings == []


def mistral_backend(handler: object) -> MistralOcrBackend:
    return MistralOcrBackend(
        api_key="k",
        server_url="https://mistral.test",
        model="m",
        timeout_seconds=1,
        transient_retries=2,
        client_factory=lambda: httpx.Client(
            transport=httpx.MockTransport(handler),  # type: ignore[arg-type]
            base_url="https://mistral.test",
        ),
    )


def ocr_response(markdowns: list[str]) -> dict[str, object]:
    return {
        "pages": [
            {
                "index": index,
                "markdown": markdown,
                "images": [
                    {
                        "id": "img-0.jpeg",
                        "image_annotation": json.dumps({"text": f"figure {index}"}),
                    }
                ],
            }
            for index, markdown in enumerate(markdowns)
        ],
        "model": "mistral-ocr-latest",
        "usage_info": {"pages_processed": len(markdowns)},
    }


def test_mistral_sends_the_backend_request_shape_and_joins_image_annotations() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json=ocr_response(["# Seite 1", "Seite 2"]))

    texts = mistral_backend(handler).ocr_pdf(b"%PDF-1.4 fake", 2)

    assert texts == ["# Seite 1\n\nfigure 0", "Seite 2\n\nfigure 1"]
    body = json.loads(seen[0].content)
    assert seen[0].url.path == "/v1/ocr"
    assert seen[0].headers["authorization"] == "Bearer k"
    assert body["model"] == "m"
    assert body["document"]["type"] == "document_url"
    assert body["document"]["document_url"].startswith("data:application/pdf;base64,")
    assert body["include_image_base64"] is False
    assert body["bbox_annotation_format"]["json_schema"]["name"] == "image_text"


def test_mistral_returns_the_provider_pages_in_index_order_without_padding() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        response = ocr_response(["b", "a"])
        response["pages"][0]["index"], response["pages"][1]["index"] = 1, 0  # type: ignore[index]
        return httpx.Response(200, json=response)

    assert mistral_backend(handler).ocr_pdf(b"x", 3) == ["a\n\nfigure 1", "b\n\nfigure 0"]


def test_a_short_ocr_response_is_padded_and_recorded_as_a_warning(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    class Short:
        model = "short"

        def call(self, pdf_bytes: bytes, page_count: int, check: object = None) -> SimpleOcrCall:
            return SimpleOcrCall(lambda: ["only the first page"])

    context = make_context(store, objects, settings, tmp_path, stage(objects, "scan-no-text.pdf"))
    with pytest.MonkeyPatch.context() as patch:
        patch.setattr(extractor, "resolve_ocr_backend", lambda _settings: Short())
        run_job(context)

    result = result_of(objects)
    assert [page.text for page in result.pages] == ["only the first page", ""]
    assert [page.method for page in result.pages] == ["ocr", "ocr"]
    assert result.document.warnings == ["ocr_page_count_mismatch"]


@pytest.mark.parametrize(
    ("status", "body", "code", "retryable"),
    [
        (
            400,
            {"type": "document_parser_invalid_file", "code": "3740"},
            "UNPROCESSABLE_DOCUMENT",
            False,
        ),
        (400, {"type": "invalid_request_file"}, "UNPROCESSABLE_DOCUMENT", False),
        (422, {"message": "semantic"}, "UNPROCESSABLE_DOCUMENT", False),
        (400, {"type": "document_parser_too_many_pages"}, "TOO_MANY_PAGES", False),
        (401, {"message": "no"}, "OCR_UNAUTHORIZED", False),
        (403, {"message": "no"}, "OCR_UNAUTHORIZED", False),
        (418, "teapot", "OCR_REJECTED", False),
        (503, {"message": "down"}, "OCR_UNAVAILABLE", True),
        (429, {"message": "slow"}, "OCR_UNAVAILABLE", True),
    ],
)
def test_mistral_failures_are_classified_per_contract(
    monkeypatch: pytest.MonkeyPatch, status: int, body: object, code: str, retryable: bool
) -> None:
    monkeypatch.setattr("time.sleep", lambda _seconds: None)
    attempts: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        attempts.append(status)
        if isinstance(body, dict):
            return httpx.Response(status, json=body)
        return httpx.Response(status, text=str(body))

    with pytest.raises(ServiceError) as error:
        mistral_backend(handler).ocr_pdf(b"x", 1)

    assert (error.value.code, error.value.retryable) == (code, retryable)
    assert error.value.details is not None
    assert error.value.details["status"] == status
    assert len(attempts) == (3 if retryable else 1)


def test_mistral_checks_the_job_before_every_attempt(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("time.sleep", lambda _seconds: None)
    posts: list[int] = []
    checks: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        posts.append(1)
        return httpx.Response(503, json={"message": "down"})

    def check() -> None:
        checks.append(1)
        if len(checks) > 1:
            raise JobInterruptedError("cancelled")

    with pytest.raises(JobInterruptedError):
        mistral_backend(handler).ocr_pdf(b"x", 1, check)

    assert posts == [1]
    assert checks == [1, 1]


def test_aborting_a_mistral_call_closes_its_connection_and_ends_the_call(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("time.sleep", lambda _seconds: None)
    entered = threading.Event()
    proceed = threading.Event()

    def handler(request: httpx.Request) -> httpx.Response:
        entered.set()
        proceed.wait(5)
        raise httpx.CloseError("connection closed", request=request)

    call = mistral_backend(handler).call(b"x", 1)
    assert isinstance(call, MistralOcrCall)
    outcome: list[object] = []
    thread = threading.Thread(target=lambda: outcome.append(_run_capturing(call)))
    thread.start()
    assert entered.wait(5)
    call.abort()
    proceed.set()
    thread.join(5)

    assert not thread.is_alive()
    assert isinstance(outcome[0], ServiceError)
    assert outcome[0].code == "OCR_UNAVAILABLE"
    with pytest.raises(RuntimeError):
        call.client.post("/v1/ocr")


def _run_capturing(call: object) -> object:
    try:
        return call.run()  # type: ignore[attr-defined]
    except ServiceError as error:
        return error


def test_mistral_retries_a_transient_failure_then_succeeds(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("time.sleep", lambda _seconds: None)
    responses = [
        httpx.Response(502, text="bad gateway"),
        httpx.Response(200, json=ocr_response(["ok"])),
    ]

    assert mistral_backend(lambda request: responses.pop(0)).ocr_pdf(b"x", 1) == ["ok\n\nfigure 0"]


def test_mistral_timeouts_and_connection_errors_are_retryable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("time.sleep", lambda _seconds: None)

    def timeout(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("slow", request=request)

    def refused(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("refused", request=request)

    with pytest.raises(ServiceError) as timed_out:
        mistral_backend(timeout).ocr_pdf(b"x", 1)
    with pytest.raises(ServiceError) as unreachable:
        mistral_backend(refused).ocr_pdf(b"x", 1)

    assert (timed_out.value.code, timed_out.value.retryable) == ("OCR_TIMEOUT", True)
    assert (unreachable.value.code, unreachable.value.retryable) == ("OCR_UNAVAILABLE", True)


def test_cancel_during_a_provider_call_abandons_it_and_blocks_retries(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    started = threading.Event()
    release = threading.Event()
    attempts: list[int] = []

    aborted = threading.Event()

    class SlowCall:
        def __init__(self, page_count: int, check: object) -> None:
            self.page_count = page_count
            self.check = check

        def run(self) -> list[str]:
            assert callable(self.check)
            self.check()
            attempts.append(self.page_count)
            started.set()
            release.wait(5)
            self.check()  # a retry would re-check the job and must now refuse
            raise AssertionError("retry started after cancel")

        def abort(self) -> None:
            aborted.set()
            release.set()

    class Slow:
        model = "slow"

        def call(self, pdf_bytes: bytes, page_count: int, check: object = None) -> SlowCall:
            return SlowCall(page_count, check)

    context = make_context(store, objects, settings, tmp_path, stage(objects, "scan-no-text.pdf"))
    errors: list[BaseException] = []

    def guarded() -> None:
        try:
            run_job(context)
        except BaseException as error:
            errors.append(error)

    with pytest.MonkeyPatch.context() as patch:
        patch.setattr(extractor, "resolve_ocr_backend", lambda _settings: Slow())
        patch.setattr(abortable, "CALL_POLL_SECONDS", 0.05)
        worker = threading.Thread(target=guarded)
        worker.start()
        assert started.wait(5)
        store.cancel(context.job_id)
        worker.join(5)

    assert not worker.is_alive()
    assert aborted.is_set()
    assert len(errors) == 1
    assert isinstance(errors[0], JobInterruptedError)
    assert errors[0].reason == "cancelled"
    assert attempts == [2]
    assert not [key for (_, key) in objects.objects if "/pages/" in key]


def test_an_ocr_failure_fails_the_job_with_the_provider_code(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    class Broken:
        model = "broken"

        def call(self, pdf_bytes: bytes, page_count: int, check: object = None) -> SimpleOcrCall:
            def fail() -> list[str]:
                raise ServiceError(
                    "OCR_UNAVAILABLE", "down", retryable=True, details={"status": 503}
                )

            return SimpleOcrCall(fail)

    context = make_context(store, objects, settings, tmp_path, stage(objects, "scan-no-text.pdf"))
    with pytest.MonkeyPatch.context() as patch:
        patch.setattr(extractor, "resolve_ocr_backend", lambda _settings: Broken())
        with pytest.raises(ServiceError) as error:
            run_job(context)

    assert error.value.code == "OCR_UNAVAILABLE"
    assert ("ayunis", f"{PREFIX}result.json") not in objects.objects
