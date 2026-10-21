"""The per-page OCR decision of contract §8.2, evaluated in order; the first match decides."""

from dataclasses import dataclass

from app.api.models import OcrMode
from app.config import Settings
from app.result import OcrReason, PageMethod, PageQuality


@dataclass(frozen=True)
class PageDecision:
    method: PageMethod
    ocr_reason: OcrReason | None = None
    rule: int = 8


def decide_page(quality: PageQuality, ocr_mode: OcrMode, settings: Settings) -> PageDecision:
    if ocr_mode == "always":
        return PageDecision("ocr", "forced", 1)
    if (
        quality.ink_ratio < settings.blank_ink_ratio
        and quality.char_count < settings.blank_char_count
    ):
        return PageDecision("blank", None, 2)
    if (
        quality.char_count < settings.no_text_char_count
        and quality.ink_ratio >= settings.no_text_ink_ratio
    ):
        return PageDecision("ocr", "no_text", 3)
    if quality.text_ink_coverage < settings.low_coverage:
        return PageDecision("ocr", "low_coverage", 4)
    if quality.garbage_ratio > settings.garbage_ratio:
        return PageDecision("ocr", "garbage", 5)
    if quality.word_validity is not None and quality.word_validity < settings.word_validity:
        return PageDecision("ocr", "invalid_words", 6)
    if settings.table_pages_to_ocr and quality.table_likelihood >= settings.table_likelihood:
        return PageDecision("ocr", "table", 7)
    return PageDecision("text", None, 8)


def apply_document_shortcut(
    decisions: dict[int, PageDecision],
    share: float,
    *,
    page_count: int | None = None,
    ocr_pages_done: int = 0,
) -> bool:
    """Above `share` of OCR pages the whole document goes to OCR, so methods do not alternate.

    `page_count` and `ocr_pages_done` account for pages a previous attempt already
    checkpointed, so a restart judges the whole document. Returns whether any page changed.
    """
    total = page_count if page_count is not None else len(decisions)
    if not decisions or total == 0:
        return False
    ocr_pages = ocr_pages_done + sum(1 for d in decisions.values() if d.method == "ocr")
    if ocr_pages / total <= share:
        return False
    flipped = [index for index, decision in decisions.items() if decision.method == "text"]
    for index in flipped:
        decisions[index] = PageDecision("ocr", "forced", decisions[index].rule)
    return bool(flipped)
