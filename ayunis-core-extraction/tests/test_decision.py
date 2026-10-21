from pathlib import Path

import pytest

from app.config import Settings
from app.pdf.decision import PageDecision, apply_document_shortcut, decide_page
from app.pdf.document import PdfFile
from app.pdf.signals import garbage_ratio, measure_page
from app.pdf.wordlists import WordLists
from app.result import PageQuality
from tests.conftest import FIXTURES

PDFS = FIXTURES / "pdf"


def quality(**overrides: float | int | None) -> PageQuality:
    values: dict[str, float | int | None] = {
        "char_count": 2000,
        "ink_ratio": 0.08,
        "text_ink_coverage": 0.95,
        "garbage_ratio": 0.0,
        "word_validity": 0.9,
        "table_likelihood": 0.0,
    }
    values.update(overrides)
    return PageQuality.model_validate(values)


@pytest.mark.parametrize(
    ("page", "expected"),
    [
        (quality(), PageDecision("text", None, 8)),
        (quality(char_count=3, ink_ratio=0.001), PageDecision("blank", None, 2)),
        (quality(char_count=10, ink_ratio=0.05), PageDecision("ocr", "no_text", 3)),
        (quality(text_ink_coverage=0.4), PageDecision("ocr", "low_coverage", 4)),
        (quality(garbage_ratio=0.2), PageDecision("ocr", "garbage", 5)),
        (quality(word_validity=0.5), PageDecision("ocr", "invalid_words", 6)),
        (quality(word_validity=None), PageDecision("text", None, 8)),
        (quality(table_likelihood=0.7), PageDecision("ocr", "table", 7)),
        (quality(char_count=10, ink_ratio=0.005), PageDecision("text", None, 8)),
    ],
)
def test_rules_are_evaluated_in_contract_order(
    settings: Settings, page: PageQuality, expected: PageDecision
) -> None:
    assert decide_page(page, "auto", settings) == expected


def test_forced_ocr_and_the_table_switch(settings: Settings) -> None:
    assert decide_page(quality(), "always", settings) == PageDecision("ocr", "forced", 1)
    assert decide_page(quality(char_count=0, ink_ratio=0), "always", settings).rule == 1
    table_off = settings.model_copy(update={"table_pages_to_ocr": False})
    assert decide_page(quality(table_likelihood=0.9), "auto", table_off).method == "text"


def test_document_shortcut_turns_the_remaining_text_pages_into_ocr() -> None:
    ocr = PageDecision("ocr", "no_text", 3)
    decisions = dict.fromkeys(range(19), ocr) | {19: PageDecision("text", None, 8)}
    assert apply_document_shortcut(decisions, 0.9) is True
    assert decisions[19] == PageDecision("ocr", "forced", 8)

    balanced = {0: ocr, 1: PageDecision("text", None, 8), 2: PageDecision("blank", None, 2)}
    assert apply_document_shortcut(balanced, 0.9) is False
    assert balanced[1].method == "text"
    assert apply_document_shortcut({}, 0.9) is False
    assert apply_document_shortcut({0: ocr, 1: ocr}, 0.9) is False

    # After a restart only the remaining pages are decided; the checkpointed ones still count.
    remaining = {95: PageDecision("text", None, 8), 96: ocr}
    assert apply_document_shortcut(dict(remaining), 0.9, page_count=100, ocr_pages_done=0) is False
    assert apply_document_shortcut(remaining, 0.9, page_count=100, ocr_pages_done=95) is True
    assert remaining[95].ocr_reason == "forced"


def test_garbage_ratio_counts_replacement_control_private_use_and_foreign_script() -> None:
    assert garbage_ratio("Beschluss", ["de"]) == 0.0
    assert garbage_ratio("Besch�uss", ["de"]) == pytest.approx(1 / 9)
    assert garbage_ratio("Be\x01schluss中", ["de"]) == pytest.approx(3 / 12)
    assert garbage_ratio("D¡e St¤dt", ["de"]) == pytest.approx(2 / 8)
    assert garbage_ratio("Gebühr 12,50 € \u2013 (fi)", ["de"]) == 0.0
    assert garbage_ratio("   ", ["de"]) == 0.0


FIXTURE_DECISIONS = [
    ("blank-scan.pdf", 0, "blank", None),
    ("born-digital.pdf", 0, "text", None),
    ("born-digital.pdf", 2, "text", None),
    ("rotated.pdf", 0, "text", None),
    ("mixed.pdf", 0, "text", None),
    ("mixed.pdf", 1, "ocr", "no_text"),
    ("mixed.pdf", 2, "text", None),
    ("partial-text-layer.pdf", 0, "ocr", "low_coverage"),
    ("poor-ocr-layer.pdf", 0, "ocr", "garbage"),
    ("poor-ocr-layer.pdf", 1, "ocr", "invalid_words"),
    ("scan-no-text.pdf", 0, "ocr", "no_text"),
    ("table.pdf", 0, "ocr", "table"),
]


@pytest.mark.parametrize(("name", "page", "method", "reason"), FIXTURE_DECISIONS)
def test_fixture_pages_get_the_expected_decision(
    settings: Settings, name: str, page: int, method: str, reason: str | None
) -> None:
    wordlists = WordLists(Path(settings.word_lists_dir or ""))
    with PdfFile(PDFS / name) as pdf:
        content = pdf.page_content(page, settings.max_page_chars, settings.max_page_rects)
        raster = pdf.render_grayscale(page, settings.render_dpi, content.rects)
    measured = measure_page(content, raster, wordlists, ["de", "en"], 30)

    decision = decide_page(measured, "auto", settings)

    assert (decision.method, decision.ocr_reason) == (method, reason)


def test_signals_of_the_fixture_pages_sit_clear_of_the_thresholds(settings: Settings) -> None:
    """The thresholds are not tuned to the fixtures: each decisive signal has margin."""
    wordlists = WordLists(Path(settings.word_lists_dir or ""))

    def measured(name: str, page: int = 0) -> PageQuality:
        with PdfFile(PDFS / name) as pdf:
            content = pdf.page_content(page, settings.max_page_chars, settings.max_page_rects)
            raster = pdf.render_grayscale(page, settings.render_dpi, content.rects)
        return measure_page(content, raster, wordlists, ["de", "en"], 30)

    born = measured("born-digital.pdf")
    assert born.text_ink_coverage > 0.95
    rotated = measured("rotated.pdf")
    assert rotated.text_ink_coverage > 0.95
    assert rotated.table_likelihood < 0.2
    assert born.word_validity is not None and born.word_validity > 0.95
    assert born.table_likelihood < 0.2
    assert measured("partial-text-layer.pdf").text_ink_coverage < 0.3
    assert measured("poor-ocr-layer.pdf", 0).garbage_ratio > 0.06
    poor = measured("poor-ocr-layer.pdf", 1)
    assert poor.garbage_ratio < 0.01 and poor.word_validity is not None and poor.word_validity < 0.4
    table = measured("table.pdf")
    assert table.table_likelihood > 0.8
    assert table.text_ink_coverage >= 0.6
    assert measured("blank-scan.pdf").ink_ratio < 0.001


def test_word_cache_is_bounded_and_long_tokens_never_reach_the_dictionary(
    settings: Settings,
) -> None:
    from app.pdf.wordlists import WordCache

    wordlists = WordLists(Path(settings.word_lists_dir or ""))
    cache = WordCache(limit=2)
    tokens = ["Stadt", "Satzung", "x" * 65, "Gebühren"]

    validity = wordlists.validity(tokens, ["de"], cache)

    assert validity == 0.75
    assert ("de_DE", "x" * 65) not in cache._entries
    assert len(cache._entries) <= 2
    assert wordlists.validity(["Stadt"], ["de"]) == 1.0


def test_off_page_text_boxes_never_count_as_coverage() -> None:
    import numpy as np

    from app.pdf.document import PixelBox
    from app.pdf.signals import text_ink_coverage

    ink = np.zeros((100, 80), dtype=bool)
    ink[60:70, 10:70] = True  # a block of ink the text layer does not describe
    above = PixelBox(left=10, top=-30, right=70, bottom=-20)
    left_of = PixelBox(left=-40, top=60, right=-30, bottom=70)
    covering = PixelBox(left=10, top=60, right=70, bottom=70)

    assert text_ink_coverage(ink, [above, left_of]) == 0.0
    assert text_ink_coverage(ink, [covering]) == 1.0
    assert text_ink_coverage(ink, [PixelBox(left=0, top=0, right=500, bottom=500)]) == 1.0


def test_word_validity_is_none_without_dictionaries(tmp_path: Path) -> None:
    missing = WordLists(tmp_path)
    assert missing.validity(["Stadt"], ["de", "en"]) is None
    assert missing.available(["de"]) is False
    assert WordLists(None).validity(["Stadt"], ["de"]) is None
