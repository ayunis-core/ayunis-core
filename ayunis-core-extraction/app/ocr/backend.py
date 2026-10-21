from typing import Protocol

from app.config import Settings


class OcrBackend(Protocol):
    model: str

    def ocr_pdf(self, pdf_bytes: bytes, page_count: int) -> list[str]:
        """Text per page of the given PDF, in page order."""


def resolve_ocr_backend(settings: Settings) -> OcrBackend | None:
    """None means OCR is not configured: pages the rule routes to OCR become `text_fallback`."""
    return None
