"""Generates the synthetic PDF fixtures the unit tests use, and the large acceptance documents.

    uv run python -m scripts.make_fixtures            # small committed set, tests/fixtures/pdf
    uv run python -m scripts.make_fixtures large DIR  # 1500-page born-digital + 300-page scan

The small set is committed so the tests never depend on the external corpus; the large
documents are generated at acceptance time and ignored by git.
"""

import io
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

FIXTURE_DIR = Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "pdf"
WIDTH, HEIGHT = A4

PROSE = [
    "Die Stadt Musterhausen beschließt die Satzung über die Erhebung von Gebühren für die",
    "Benutzung der städtischen Kindertagesstätten. Der Gemeinderat hat in seiner Sitzung",
    "die Beschlussvorlage einstimmig angenommen. Die Verwaltung wird beauftragt, die",
    "Elternbeiträge zum Beginn des kommenden Kindergartenjahres anzupassen und die",
    "betroffenen Familien schriftlich über die neuen Gebührensätze zu informieren.",
    "Gegen diesen Bescheid kann innerhalb eines Monats nach Bekanntgabe Widerspruch",
    "erhoben werden. Der Widerspruch ist schriftlich oder zur Niederschrift bei der",
    "Stadtverwaltung einzulegen. Weitere Auskünfte erteilt das Bürgerbüro im Rathaus.",
]

GARBAGE_LAYER = [
    "D¡e St@dt Mu§terh@usen be§chl¡eßt d¡e S@tzung über d¡e Erhebung v0n Gebühren",
    "Benutzung der städt¡schen K¡ndert@gesstätten. Der Geme¡nder@t h@t ¡n se¡ner S¡tzung",
    "d¡e Be§chlu§§v0rl@ge e¡nst¡mm¡g @ngen0mmen. D¡e Verw@ltung w¡rd be@uftr@gt, d¡e",
    "�� Elternbe¡träge zum Beg¡nn des k0mmenden K¡nderg@rtenj@hres @nzup@ssen �",
]

MISSPELT_LAYER = [
    "Dle Stadt Musterhauson beschliesst dle Satzunq uber dle Erhebunq von Gebuhron fur dle",
    "Benutzunq der stadtischon Kindertaqesstatten Der Gemeinderot hat in seinor Sitzunq",
    "dle Beschlussvorlaqe einstimmiq anqenommon Dle Verwaltunq wlrd beauftraqt dle",
    "Elternbeitrage zum Beqinn des kommendon Kinderqartenjahres anzupasson und dle",
    "betroffenon Familion schriftlich uber dle neuon Gebuhronsatze zu informioron",
    "Gegon diesen Bescheld kann innerhalb elnes Monats nach Bekanntqabe Widerspruch",
]


def prose_lines(seed: int, count: int) -> list[str]:
    rng = random.Random(seed)
    return [rng.choice(PROSE) for _ in range(count)]


def draw_prose(pdf: canvas.Canvas, lines: list[str], heading: str | None = None) -> None:
    y = HEIGHT - 72
    if heading:
        pdf.setFont("Helvetica-Bold", 16)
        pdf.drawString(72, y, heading)
        y -= 36
    pdf.setFont("Helvetica", 11)
    for line in lines:
        pdf.drawString(72, y, line)
        y -= 16
        if y < 72:
            break


def text_image(lines: list[str], seed: int, noise: int = 0, dpi: int = 100) -> Image.Image:
    """A raster of text as a copier would produce it; `noise` adds grain so JPEG stays large."""
    width, height = int(WIDTH / 72 * dpi), int(HEIGHT / 72 * dpi)
    image = Image.new("L", (width, height), 255)
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default(size=int(11 * dpi / 72))
    y = dpi
    for line in lines:
        draw.text((dpi, y), line, fill=0, font=font)
        y += int(16 * dpi / 72)
        if y > height - dpi:
            break
    if noise:
        rng = random.Random(seed)
        pixels = image.load()
        assert pixels is not None
        for _ in range(noise):
            x, y = rng.randrange(width), rng.randrange(height)
            pixels[x, y] = rng.randrange(0, 200)
    return image


def draw_image(pdf: canvas.Canvas, image: Image.Image, quality: int = 50) -> None:
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=quality)
    buffer.seek(0)
    pdf.drawImage(ImageReader(buffer), 0, 0, width=WIDTH, height=HEIGHT)


def draw_invisible_text(pdf: canvas.Canvas, lines: list[str]) -> None:
    """Text render mode 3: present in the text layer, invisible on the page, like copier OCR."""
    text = pdf.beginText(72, HEIGHT - 72)
    text.setTextRenderMode(3)
    text.setFont("Helvetica", 11)
    for line in lines:
        text.textLine(line)
    pdf.drawText(text)


def draw_table(pdf: canvas.Canvas) -> None:
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(72, HEIGHT - 72, "Gebührentabelle Kindertagesstätten")
    columns = [72, 200, 320, 440]
    top = HEIGHT - 110
    row_height = 22
    rows = [("Betreuungsform", "Stunden", "Gebühr", "Geschwister")] + [
        (f"Gruppe {row}", f"{20 + row * 5} h", f"{100 + row * 17},00 €", f"{50 + row * 8},50 €")
        for row in range(1, 16)
    ]
    pdf.setFont("Helvetica", 10)
    for row_index, row in enumerate(rows):
        y = top - row_index * row_height
        for column, value in zip(columns, row, strict=True):
            pdf.drawString(column + 4, y - 15, value)
        pdf.line(72, y, 540, y)
    bottom = top - len(rows) * row_height
    pdf.line(72, bottom, 540, bottom)
    for column in [*columns, 540]:
        pdf.line(column, top, column, bottom)


def born_digital(path: Path, pages: int, seed: int = 1) -> None:
    pdf = canvas.Canvas(str(path), pagesize=A4)
    for page in range(pages):
        draw_prose(pdf, prose_lines(seed + page, 40), heading=f"Beschlussvorlage {page + 1}")
        pdf.showPage()
    pdf.save()


def blank_scan(path: Path) -> None:
    pdf = canvas.Canvas(str(path), pagesize=A4)
    draw_image(pdf, text_image([], seed=7, noise=400))
    pdf.showPage()
    pdf.save()


def scan_no_text(
    path: Path, pages: int, seed: int = 3, noise: int = 600, quality: int = 50, dpi: int = 100
) -> None:
    pdf = canvas.Canvas(str(path), pagesize=A4)
    for page in range(pages):
        draw_image(pdf, text_image(prose_lines(seed + page, 40), seed + page, noise, dpi), quality)
        pdf.showPage()
    pdf.save()


def poor_ocr_layer(path: Path) -> None:
    pdf = canvas.Canvas(str(path), pagesize=A4)
    draw_image(pdf, text_image(prose_lines(11, 40), 11, noise=600))
    draw_invisible_text(pdf, GARBAGE_LAYER * 10)
    pdf.showPage()
    draw_image(pdf, text_image(prose_lines(12, 40), 12, noise=600))
    draw_invisible_text(pdf, MISSPELT_LAYER * 7)
    pdf.showPage()
    pdf.save()


def partial_text_layer(path: Path) -> None:
    """A stamped header over a scanned body: the text layer covers a fraction of the ink."""
    pdf = canvas.Canvas(str(path), pagesize=A4)
    body = text_image(prose_lines(21, 40), 21, noise=600)
    draw_image(pdf, body)
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(72, HEIGHT - 40, "Eingegangen am 12.03.2024, Aktenzeichen 31-4711/2024")
    pdf.showPage()
    pdf.save()


def table(path: Path) -> None:
    pdf = canvas.Canvas(str(path), pagesize=A4)
    draw_table(pdf)
    pdf.showPage()
    pdf.save()


def mixed(path: Path) -> None:
    pdf = canvas.Canvas(str(path), pagesize=A4)
    draw_prose(pdf, prose_lines(31, 40), heading="Anschreiben")
    pdf.showPage()
    draw_image(pdf, text_image(prose_lines(32, 40), 32, noise=600))
    pdf.showPage()
    draw_prose(pdf, prose_lines(33, 40), heading="Anlage 2")
    pdf.showPage()
    pdf.save()


def rotated(path: Path) -> None:
    """A landscape media box with /Rotate 90: the text rectangles live in unrotated space."""
    pdf = canvas.Canvas(str(path), pagesize=landscape(A4))
    pdf.translate(0, WIDTH)
    pdf.rotate(-90)
    draw_prose(pdf, prose_lines(41, 40), heading="Gedrehte Seite")
    pdf.setPageRotation(90)
    pdf.showPage()
    pdf.save()


def small_set(directory: Path = FIXTURE_DIR) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    born_digital(directory / "born-digital.pdf", pages=3)
    rotated(directory / "rotated.pdf")
    blank_scan(directory / "blank-scan.pdf")
    scan_no_text(directory / "scan-no-text.pdf", pages=2)
    poor_ocr_layer(directory / "poor-ocr-layer.pdf")
    partial_text_layer(directory / "partial-text-layer.pdf")
    table(directory / "table.pdf")
    mixed(directory / "mixed.pdf")


def large_set(directory: Path) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    born_digital(directory / "born-digital-1500.pdf", pages=1500)
    scan_no_text(directory / "scan-300.pdf", pages=300, noise=150000, quality=95, dpi=200)


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "large":
        large_set(Path(sys.argv[2]))
    else:
        small_set()
