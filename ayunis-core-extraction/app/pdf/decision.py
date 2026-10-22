"""Per-page method decision. The quality-and-coverage rule of contract §8 lands with its signals."""

from dataclasses import dataclass

from app.result import OcrReason, PageMethod


@dataclass(frozen=True)
class PageDecision:
    method: PageMethod
    ocr_reason: OcrReason | None = None


def decide_from_text(text: str) -> PageDecision:
    if text.strip():
        return PageDecision("text")
    return PageDecision("blank")
