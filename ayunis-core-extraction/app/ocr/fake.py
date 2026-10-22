"""Deterministic OCR for tests and the dev stack: no provider, no network, no cost."""

import hashlib
import io
import time
from collections.abc import Callable
from functools import partial

import pypdfium2 as pdfium

from app.ocr.backend import OcrCall, StopCheck
from app.pdf.document import pdfium_lock


class FakeOcrBackend:
    model = "fake-ocr"

    def __init__(self, delay_seconds: float = 0.0) -> None:
        self.delay_seconds = delay_seconds
        self.calls: list[int] = []

    def call(self, pdf_bytes: bytes, page_count: int, check: StopCheck | None = None) -> OcrCall:
        return SimpleOcrCall(partial(self.ocr_pdf, pdf_bytes, page_count, check))

    def ocr_pdf(
        self, pdf_bytes: bytes, page_count: int, check: StopCheck | None = None
    ) -> list[str]:
        if check is not None:
            check()
        self.calls.append(page_count)
        if self.delay_seconds:
            time.sleep(self.delay_seconds)
        digest = hashlib.sha256(pdf_bytes).hexdigest()[:12]
        with pdfium_lock():
            document = pdfium.PdfDocument(io.BytesIO(pdf_bytes))
            try:
                layers = [_text_layer(document, index) for index in range(len(document))]
            finally:
                document.close()
        return [
            f"[fake-ocr {digest} page {index + 1}/{page_count}]" + (f"\n{layer}" if layer else "")
            for index, layer in enumerate(layers)
        ]


class SimpleOcrCall:
    """A call with nothing to abort: the function runs to its end, the result is dropped."""

    def __init__(self, run: Callable[[], list[str]]) -> None:
        self._run = run

    def run(self) -> list[str]:
        return self._run()

    def abort(self) -> None:
        return None


def _text_layer(document: pdfium.PdfDocument, index: int) -> str:
    page = document[index]
    try:
        textpage = page.get_textpage()
        try:
            return str(textpage.get_text_range()).strip()
        finally:
            textpage.close()
    finally:
        page.close()
