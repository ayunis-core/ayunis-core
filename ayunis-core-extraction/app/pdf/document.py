"""pypdfium2 behind one lock: PDFium is not thread-safe, the worker pool is multi-threaded."""

import math
import threading
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pypdfium2 as pdfium
from numpy.typing import NDArray

from app.errors import ServiceError

_PDFIUM_LOCK = threading.RLock()
DEFAULT_MAX_RENDER_PIXELS = 4_000_000


def pdfium_lock() -> threading.RLock:
    return _PDFIUM_LOCK


@dataclass(frozen=True)
class TextRect:
    """A text rectangle in PDF points, origin bottom-left (pypdfium2 `get_rect`)."""

    left: float
    bottom: float
    right: float
    top: float


@dataclass(frozen=True)
class PageContent:
    index: int
    width: float
    height: float
    text: str
    rects: list[TextRect]
    truncated: bool = False


@dataclass(frozen=True)
class PixelBox:
    """A text rectangle on the rendered raster: columns `left:right`, rows `top:bottom`."""

    left: int
    top: int
    right: int
    bottom: int


@dataclass(frozen=True)
class PageRaster:
    """Grayscale pixels, rows top to bottom, 0 black to 255 white, with the text boxes mapped
    onto them by PDFium itself, so page rotation is accounted for."""

    pixels: NDArray[np.uint8]
    boxes: list[PixelBox]

    @property
    def height(self) -> int:
        return int(self.pixels.shape[0])

    @property
    def width(self) -> int:
        return int(self.pixels.shape[1])


class PdfFile:
    """One open document; every method takes the PDFium lock."""

    def __init__(self, path: Path) -> None:
        self.path = path
        with _PDFIUM_LOCK:
            try:
                self._pdf = pdfium.PdfDocument(str(path))
                self.page_count = len(self._pdf)
            except pdfium.PdfiumError as error:
                raise ServiceError(
                    "UNPROCESSABLE_DOCUMENT",
                    "The PDF could not be opened: corrupt or password protected",
                    details={"reason": str(error)},
                ) from error

    def close(self) -> None:
        with _PDFIUM_LOCK:
            self._pdf.close()

    def __enter__(self) -> "PdfFile":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    def page_content(
        self, index: int, max_chars: int, max_rects: int, with_rects: bool = True
    ) -> PageContent:
        """The text layer, cut at `max_chars` characters and `max_rects` rectangles.

        Rectangles are only counted over the characters kept, and not at all when the caller
        extracts text without measuring the page (`with_rects=False`).
        """
        with _PDFIUM_LOCK, self._page(index) as page, _document_errors(index):
            width, height = page.get_size()
            textpage = page.get_textpage()
            try:
                char_count = textpage.count_chars()
                truncated = char_count > max_chars
                kept = min(char_count, max_chars)
                text = (
                    textpage.get_text_range(count=kept) if truncated else textpage.get_text_range()
                )
                rects: list[TextRect] = []
                if with_rects and kept > 0:
                    rect_count = min(textpage.count_rects(index=0, count=kept), max_rects)
                    rects = [TextRect(*textpage.get_rect(i)) for i in range(rect_count)]
            finally:
                textpage.close()
        return PageContent(index, float(width), float(height), text, rects, truncated)

    def render_grayscale(
        self,
        index: int,
        dpi: int,
        rects: list[TextRect] | None = None,
        max_pixels: int = DEFAULT_MAX_RENDER_PIXELS,
    ) -> PageRaster:
        """A small grayscale render; `rects` from `page_content` come back as pixel boxes.

        The scale is reduced when the page box would exceed `max_pixels`, so an oversized
        media box cannot grow the process; the signals are ratios and survive the downsampling.
        """
        with _PDFIUM_LOCK, self._page(index) as page, _document_errors(index):
            width, height = page.get_size()
            scale = _bounded_scale(dpi / 72, float(width), float(height), max_pixels)
            bitmap = page.render(scale=scale, grayscale=True, may_draw_forms=False)
            try:
                if bitmap.width * bitmap.height > max_pixels:
                    raise ServiceError(
                        "UNPROCESSABLE_DOCUMENT",
                        "Rendered page exceeds the pixel budget",
                        details={"maxPixels": max_pixels},
                    )
                # to_numpy() is a view of PDFium's buffer; copy before the bitmap is freed.
                array = bitmap.to_numpy()
                pixels = np.array(array[:, :, 0] if array.ndim == 3 else array, dtype=np.uint8)
                converter = bitmap.get_posconv(page)
                boxes = [_pixel_box(converter, rect) for rect in rects or []]
            finally:
                bitmap.close()
        return PageRaster(pixels, boxes)

    def write_subset(self, indices: list[int], destination: Path) -> int:
        """A new PDF holding the given pages in order; returns its size in bytes."""
        with _PDFIUM_LOCK, _document_errors(indices[0] if indices else 0):
            subset = pdfium.PdfDocument.new()
            try:
                subset.import_pages(self._pdf, pages=indices)
                with destination.open("wb") as handle:
                    subset.save(handle)
            finally:
                subset.close()
        return destination.stat().st_size

    @contextmanager
    def _page(self, index: int) -> Iterator[pdfium.PdfPage]:
        try:
            page = self._pdf[index]
        except pdfium.PdfiumError as error:
            raise ServiceError(
                "UNPROCESSABLE_DOCUMENT",
                f"Page {index + 1} could not be loaded",
                details={"reason": str(error), "page": index},
            ) from error
        try:
            yield page
        finally:
            page.close()


@contextmanager
def _document_errors(index: int) -> Iterator[None]:
    """Any PDFium failure after the page is open is the document's fault, not a crash."""
    try:
        yield
    except pdfium.PdfiumError as error:
        raise ServiceError(
            "UNPROCESSABLE_DOCUMENT",
            f"Page {index + 1} could not be processed",
            details={"reason": str(error), "page": index},
        ) from error


def _bounded_scale(scale: float, width: float, height: float, max_pixels: int) -> float:
    """The largest scale at or below `scale` whose bitmap, as PDFium allocates it (each side
    rounded up to at least one pixel), stays within `max_pixels`. A degenerate aspect ratio
    needs more than one pass because the one-pixel floor on the short side does not shrink."""
    for _ in range(8):
        pixels = _render_pixels(scale, width, height)
        if pixels <= max_pixels:
            return scale
        # Once a side sits on the one-pixel floor only the other side shrinks, linearly.
        floored = min(width * scale, height * scale) <= 1.0
        factor = max_pixels / pixels
        scale = scale * (factor if floored else factor**0.5)
    if _render_pixels(scale, width, height) > max_pixels:
        raise ServiceError(
            "UNPROCESSABLE_DOCUMENT",
            "Page box too large to render within the pixel budget",
            details={"width": width, "height": height, "maxPixels": max_pixels},
        )
    return scale


def _render_pixels(scale: float, width: float, height: float) -> int:
    return max(1, math.ceil(width * scale)) * max(1, math.ceil(height * scale))


def _pixel_box(converter: pdfium.PdfPosConv, rect: TextRect) -> PixelBox:
    corners = [
        converter.to_bitmap(rect.left, rect.bottom),
        converter.to_bitmap(rect.right, rect.top),
    ]
    xs = sorted(int(x) for x, _ in corners)
    ys = sorted(int(y) for _, y in corners)
    return PixelBox(left=xs[0], top=ys[0], right=xs[1] + 1, bottom=ys[1] + 1)
