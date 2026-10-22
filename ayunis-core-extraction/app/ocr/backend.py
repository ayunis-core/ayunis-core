from collections.abc import Callable
from typing import Protocol

from app.config import Settings

StopCheck = Callable[[], None]


class OcrCall(Protocol):
    """One provider exchange for one batch; `abort` tears down its connection from any thread."""

    def run(self) -> list[str]:
        """Text per page of the batch, in page order; raises ServiceError on failure."""

    def abort(self) -> None: ...


class OcrBackend(Protocol):
    model: str

    def call(self, pdf_bytes: bytes, page_count: int, check: StopCheck | None = None) -> OcrCall:
        """Prepares the exchange. `check` is called before every provider attempt and raises when
        the job must stop, so a cancelled job never re-sends the document (contract §7.1)."""

    def ocr_pdf(
        self, pdf_bytes: bytes, page_count: int, check: StopCheck | None = None
    ) -> list[str]:
        """`call(...).run()` for callers that do not need to abort."""


def resolve_ocr_backend(settings: Settings) -> OcrBackend | None:
    """None means OCR is not configured: pages the rule routes to OCR become `text_fallback`."""
    if settings.ocr_backend == "fake":
        from app.ocr.fake import FakeOcrBackend

        return FakeOcrBackend(delay_seconds=settings.fake_ocr_delay_seconds)
    if settings.mistral_api_key:
        from app.ocr.mistral import MistralOcrBackend

        return MistralOcrBackend(
            api_key=settings.mistral_api_key,
            server_url=settings.mistral_server_url,
            model=settings.ocr_model,
            timeout_seconds=settings.ocr_call_timeout_seconds,
            transient_retries=settings.ocr_transient_retries,
        )
    return None
