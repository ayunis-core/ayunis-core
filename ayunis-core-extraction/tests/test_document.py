from pathlib import Path

import pytest

from app.errors import ServiceError
from app.pdf.document import PdfFile
from tests.conftest import FIXTURES

PDFS = FIXTURES / "pdf"


def test_page_count_text_and_rects_of_a_born_digital_page() -> None:
    with PdfFile(PDFS / "born-digital.pdf") as pdf:
        content = pdf.page_content(0, max_chars=100_000, max_rects=5_000)

    assert pdf.page_count == 3
    assert content.truncated is False
    assert content.text.startswith("Beschlussvorlage 1")
    assert "Kindertagesstätten" in content.text
    assert (round(content.width), round(content.height)) == (595, 842)
    assert len(content.rects) > 20
    assert all(rect.right > rect.left and rect.top > rect.bottom for rect in content.rects)


def test_render_grayscale_gives_a_small_raster_with_ink_where_the_text_is() -> None:
    with PdfFile(PDFS / "born-digital.pdf") as pdf:
        content = pdf.page_content(0, max_chars=100_000, max_rects=5_000)
        raster = pdf.render_grayscale(0, dpi=50, rects=content.rects)
        blank = PdfFile(PDFS / "blank-scan.pdf").render_grayscale(0, dpi=50)

    assert raster.pixels.shape == (585, 414)
    assert (raster.height, raster.width) == (585, 414)
    assert raster.pixels.dtype.name == "uint8"
    assert 0.05 < float((raster.pixels < 160).mean()) < 0.3
    assert float((blank.pixels < 160).mean()) < 0.002
    assert len(raster.boxes) == len(content.rects)
    first = raster.boxes[0]
    assert 0 <= first.left < first.right <= 414
    assert 0 <= first.top < first.bottom <= 585
    assert blank.boxes == []


def test_page_content_caps_characters_and_rectangles() -> None:
    with PdfFile(PDFS / "born-digital.pdf") as pdf:
        capped = pdf.page_content(0, max_chars=50, max_rects=5_000)
        few_rects = pdf.page_content(0, max_chars=100_000, max_rects=3)
        full = pdf.page_content(0, max_chars=100_000, max_rects=5_000)

    assert capped.truncated is True
    assert len(capped.text) == 50
    assert full.text.startswith(capped.text)
    assert 0 < len(capped.rects) < len(full.rects)
    assert len(few_rects.rects) == 3
    assert len(full.rects) > 3
    with PdfFile(PDFS / "born-digital.pdf") as pdf:
        text_only = pdf.page_content(0, 100_000, 5_000, with_rects=False)
    assert text_only.rects == []
    assert text_only.text == full.text


def test_raster_pixels_survive_the_bitmap_being_freed() -> None:
    with PdfFile(PDFS / "born-digital.pdf") as pdf:
        first = pdf.render_grayscale(0, dpi=50)
        for _ in range(20):
            pdf.render_grayscale(1, dpi=50)
        again = pdf.render_grayscale(0, dpi=50)

    assert first.pixels.flags["OWNDATA"]
    assert (first.pixels == again.pixels).all()


def test_write_subset_produces_a_pdf_with_the_chosen_pages(tmp_path: Path) -> None:
    target = tmp_path / "subset.pdf"
    with PdfFile(PDFS / "born-digital.pdf") as pdf:
        size = pdf.write_subset([2, 0], target)
    with PdfFile(target) as subset:
        first = subset.page_content(0, 100_000, 5_000).text
        second = subset.page_content(1, 100_000, 5_000).text

    assert size == target.stat().st_size > 0
    assert subset.page_count == 2
    assert first.startswith("Beschlussvorlage 3")
    assert second.startswith("Beschlussvorlage 1")


def test_an_oversized_page_box_is_rendered_within_the_pixel_budget(tmp_path: Path) -> None:
    from reportlab.pdfgen import canvas

    huge = tmp_path / "huge.pdf"
    pdf = canvas.Canvas(str(huge), pagesize=(40_000, 40_000))
    pdf.drawString(100, 39_000, "tiny text on a vast page")
    pdf.showPage()
    pdf.save()

    with PdfFile(huge) as document:
        content = document.page_content(0, 1000, 100)
        raster = document.render_grayscale(0, dpi=50, rects=content.rects, max_pixels=250_000)

    assert raster.width * raster.height <= 250_000
    assert raster.width > 100 and raster.height > 100
    assert len(raster.boxes) == len(content.rects) == 1
    box = raster.boxes[0]
    assert 0 <= box.left < box.right <= raster.width
    assert 0 <= box.top < box.bottom <= raster.height


def test_a_degenerate_page_box_still_respects_the_pixel_budget(tmp_path: Path) -> None:
    from reportlab.pdfgen import canvas

    strip = tmp_path / "strip.pdf"
    pdf = canvas.Canvas(str(strip), pagesize=(14_400, 1))
    pdf.showPage()
    pdf.save()

    with PdfFile(strip) as document:
        raster = document.render_grayscale(0, dpi=50, max_pixels=2_000)

    assert raster.width * raster.height <= 2_000
    assert raster.height >= 1


def test_pdfium_failures_after_opening_are_document_errors(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import pypdfium2 as pdfium

    def broken(self: object, *args: object, **kwargs: object) -> object:
        raise pdfium.PdfiumError("corrupt content stream")

    monkeypatch.setattr(pdfium.PdfPage, "get_textpage", broken)
    monkeypatch.setattr(pdfium.PdfPage, "render", broken)
    with PdfFile(PDFS / "born-digital.pdf") as pdf:
        with pytest.raises(ServiceError) as text_error:
            pdf.page_content(0, 1000, 100)
        with pytest.raises(ServiceError) as render_error:
            pdf.render_grayscale(0, dpi=50)

    assert text_error.value.code == "UNPROCESSABLE_DOCUMENT"
    assert text_error.value.details == {"reason": "corrupt content stream", "page": 0}
    assert render_error.value.code == "UNPROCESSABLE_DOCUMENT"


def test_a_corrupt_file_is_unprocessable(tmp_path: Path) -> None:
    corrupt = tmp_path / "corrupt.pdf"
    corrupt.write_bytes(b"%PDF-1.4\nthis is not a pdf body")

    with pytest.raises(ServiceError) as error:
        PdfFile(corrupt)

    assert error.value.code == "UNPROCESSABLE_DOCUMENT"
    assert error.value.retryable is False
