"""The per-page signals of contract §8.1, from one low-resolution render and the text page."""

import itertools
import re
import unicodedata
from collections.abc import Iterable
from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from app.pdf.document import PageContent, PageRaster, PixelBox
from app.pdf.wordlists import WordCache, WordLists
from app.result import PageQuality

INK_THRESHOLD = 160
RULING_THRESHOLD = 110
MIN_INK_PIXELS_FOR_COVERAGE = 50
TEXT_BOX_PADDING_PX = 2
WIDE_GAP_EMS = 2.0
WIDE_GAPS_PER_TABLE_LINE = 3
HORIZONTAL_RULING_SHARE = 0.5
VERTICAL_RULING_SHARE = 0.3

_TOKEN = re.compile(r"[^\W\d_]{3,}")

# Latin script plus the punctuation and symbols municipal documents use; everything else
# in a de/en document is a sign of a broken text layer.
_LATIN_RANGES = (
    (0x0020, 0x007E),
    (0x00A0, 0x024F),
    (0x1E00, 0x1EFF),
    (0x2000, 0x206F),
    (0x20A0, 0x20CF),
    (0x2100, 0x214F),
    (0x2190, 0x21FF),
    (0x2200, 0x22FF),
    (0x2500, 0x257F),
    (0x25A0, 0x25FF),
    (0x2600, 0x26FF),
    (0x2700, 0x27BF),
    (0xFB00, 0xFB06),
)
# Latin-1 code points copier OCR emits for mis-read letters and that de/en text does not use.
_SUSPICIOUS = set(
    "\u00a4\u00a6\u00a8\u00ac\u00af\u00b4\u00b8\u00a2\u00a5\u00bf\u00a1\u00f0\u00fe\u00d0\u00de"
)


def measure_page(
    content: PageContent,
    raster: PageRaster,
    wordlists: WordLists,
    language_hints: Iterable[str],
    min_tokens: int,
    word_cache: WordCache | None = None,
) -> PageQuality:
    hints = list(language_hints)
    collapsed = " ".join(content.text.split())
    ink = raster.pixels < INK_THRESHOLD
    tokens = _TOKEN.findall(content.text)
    rulings = find_rulings(raster)
    # Table and letterhead rules are ink the text layer can never cover; they must not read
    # as a missing text layer.
    ink_without_rulings = np.logical_and(ink, np.logical_not(rulings.mask))
    return PageQuality(
        char_count=len(collapsed),
        ink_ratio=round(float(ink.mean()), 4),
        text_ink_coverage=round(text_ink_coverage(ink_without_rulings, raster.boxes), 4),
        garbage_ratio=round(garbage_ratio(collapsed, hints), 4),
        word_validity=_rounded(wordlists.validity(tokens, hints, word_cache))
        if len(tokens) >= min_tokens
        else None,
        table_likelihood=round(table_likelihood(raster.boxes, rulings), 4),
    )


def text_ink_coverage(ink: NDArray[np.bool_], boxes: list[PixelBox]) -> float:
    """Share of ink inside the text boxes, padded by about 2 pt; 1.0 for an inkless page."""
    total = int(ink.sum())
    if total < MIN_INK_PIXELS_FOR_COVERAGE:
        return 1.0
    mask = np.zeros_like(ink)
    height, width = ink.shape
    pad = TEXT_BOX_PADDING_PX
    for box in boxes:
        # Both ends clamped: a box off the raster's top or left edge must not wrap around.
        top, bottom = _clamp(box.top - pad, height), _clamp(box.bottom + pad, height)
        left, right = _clamp(box.left - pad, width), _clamp(box.right + pad, width)
        if bottom > top and right > left:
            mask[top:bottom, left:right] = True
    return float(np.logical_and(ink, mask).sum() / total)


def _clamp(value: int, limit: int) -> int:
    return min(max(value, 0), limit)


def garbage_ratio(collapsed: str, language_hints: Iterable[str]) -> float:
    characters = [ch for ch in collapsed if not ch.isspace()]
    if not characters:
        return 0.0
    ranges = _LATIN_RANGES
    bad = sum(1 for ch in characters if _is_garbage(ch, ranges))
    return bad / len(characters)


def _is_garbage(ch: str, ranges: tuple[tuple[int, int], ...]) -> bool:
    if ch == "�" or ch in _SUSPICIOUS:
        return True
    category = unicodedata.category(ch)
    if category in ("Cc", "Co", "Cn", "Cs"):
        return True
    code = ord(ch)
    return not any(low <= code <= high for low, high in ranges)


@dataclass(frozen=True)
class Rulings:
    horizontal: int
    vertical: int
    mask: NDArray[np.bool_]


def find_rulings(raster: PageRaster) -> Rulings:
    """Long straight dark runs: table grids, letterhead rules, underlines of form fields."""
    dark = raster.pixels < RULING_THRESHOLD
    horizontal, rows = _flag_rulings(dark, int(raster.width * HORIZONTAL_RULING_SHARE))
    vertical, columns = _flag_rulings(dark.T, int(raster.height * VERTICAL_RULING_SHARE))
    # Anti-aliasing spreads a one-point rule over two raster rows; cover both.
    mask = np.logical_or(_dilate(rows)[:, None], _dilate(columns)[None, :])
    return Rulings(horizontal, vertical, mask)


def _dilate(flags: NDArray[np.bool_]) -> NDArray[np.bool_]:
    widened = flags.copy()
    widened[1:] |= flags[:-1]
    widened[:-1] |= flags[1:]
    return widened


def table_likelihood(boxes: list[PixelBox], rulings: Rulings) -> float:
    lines = _group_lines(boxes)
    if lines:
        table_lines = sum(1 for line in lines if _wide_gaps(line) >= WIDE_GAPS_PER_TABLE_LINE)
        line_score = min(1.0, (table_lines / len(lines)) / 0.3)
    else:
        line_score = 0.0
    ruling_score = min(1.0, (rulings.horizontal / 4 + rulings.vertical / 3) / 2)
    return min(1.0, 0.6 * line_score + 0.4 * ruling_score)


def _group_lines(boxes: list[PixelBox]) -> list[list[PixelBox]]:
    """Boxes whose vertical centres lie within half a box height of each other form a line."""
    lines: list[list[PixelBox]] = []
    for box in sorted(boxes, key=lambda b: b.top + b.bottom):
        center = (box.top + box.bottom) / 2
        tolerance = max(1.0, (box.bottom - box.top) / 2)
        if lines:
            anchor = lines[-1][0]
            if abs((anchor.top + anchor.bottom) / 2 - center) <= tolerance:
                lines[-1].append(box)
                continue
        lines.append([box])
    return lines


def _wide_gaps(line: list[PixelBox]) -> int:
    ordered = sorted(line, key=lambda b: b.left)
    heights = sorted(b.bottom - b.top for b in ordered)
    em = max(1.0, float(heights[len(heights) // 2]))
    return sum(
        1
        for previous, current in itertools.pairwise(ordered)
        if current.left - previous.right > WIDE_GAP_EMS * em
    )


def _flag_rulings(dark: NDArray[np.bool_], min_run: int) -> tuple[int, NDArray[np.bool_]]:
    """Rows holding one contiguous dark run of at least `min_run` pixels, merged when adjacent."""
    flags = np.zeros(dark.shape[0], dtype=bool)
    if min_run <= 0:
        return 0, flags
    rulings = 0
    previous = False
    for position, row in enumerate(dark):
        flagged = _longest_run(row) >= min_run
        flags[position] = flagged
        if flagged and not previous:
            rulings += 1
        previous = flagged
    return rulings, flags


def _longest_run(row: NDArray[np.bool_]) -> int:
    if not row.any():
        return 0
    padded = np.concatenate(([0], row.astype(np.int8), [0]))
    edges = np.diff(padded)
    starts = np.flatnonzero(edges == 1)
    ends = np.flatnonzero(edges == -1)
    return int((ends - starts).max())


def _rounded(value: float | None) -> float | None:
    return None if value is None else round(value, 4)
