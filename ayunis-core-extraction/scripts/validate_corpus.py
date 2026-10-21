"""Corpus harness for the OCR decision rule (contract §9.4), dry run: no OCR is called.

    CORPUS_DIR=/path/to/corpus uv run python -m scripts.validate_corpus [--price-per-page 0.001]

The corpus lives outside the repository. Every `*.pdf` below CORPUS_DIR is analysed; an optional
`manifest.yaml` (contract §9.2) gives each file a category and expectations. Without it the
first directory below CORPUS_DIR is the category. Output: `decisions-<ruleVersion>.csv` next to
the manifest with every page's signals and decision, and a summary per category with the OCR
share for rule 7 on and off, the recall of "needs OCR" against the manifest, and the estimated
cost at the given per-page price.
"""

import argparse
import csv
import os
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

from app.config import RULE_VERSION, Settings
from app.pdf.decision import PageDecision, apply_document_shortcut, decide_page
from app.pdf.document import PdfFile
from app.pdf.signals import measure_page
from app.pdf.wordlists import WordCache, WordLists
from app.result import PageQuality

COLUMNS = [
    "file",
    "category",
    "page",
    "method",
    "ocrReason",
    "rule",
    "methodTableOff",
    "charCount",
    "inkRatio",
    "textInkCoverage",
    "garbageRatio",
    "wordValidity",
    "tableLikelihood",
    "expectedOcr",
]


@dataclass
class Entry:
    file: Path
    category: str
    expected_ocr: str | list[int] | None = None


@dataclass
class CategorySummary:
    pages: int = 0
    ocr_on: int = 0
    ocr_off: int = 0
    blank: int = 0
    expected_ocr: int = 0
    expected_found: int = 0
    expected_text: int = 0
    expected_text_kept: int = 0
    reasons: dict[str, int] = field(default_factory=lambda: defaultdict(int))


def load_entries(corpus: Path) -> list[Entry]:
    manifest = corpus / "manifest.yaml"
    if manifest.exists():
        raw: list[dict[str, Any]] = yaml.safe_load(manifest.read_text()) or []
        return [
            Entry(
                file=corpus / item["file"],
                category=str(item.get("category") or Path(item["file"]).parts[0]),
                expected_ocr=(item.get("expected") or {}).get("ocrPages"),
            )
            for item in raw
        ]
    entries = []
    for pdf in sorted(corpus.rglob("*.pdf")):
        relative = pdf.relative_to(corpus)
        category = relative.parts[0] if len(relative.parts) > 1 else "uncategorised"
        entries.append(Entry(file=pdf, category=category))
    return entries


def expected_for_page(entry: Entry, index: int) -> bool | None:
    if entry.expected_ocr is None:
        return None
    if entry.expected_ocr == "all":
        return True
    if entry.expected_ocr == "none":
        return False
    return index in entry.expected_ocr


def analyse_entry(
    entry: Entry, settings: Settings, wordlists: WordLists
) -> list[tuple[PageQuality, PageDecision, PageDecision]]:
    table_off = settings.model_copy(update={"table_pages_to_ocr": False})
    pages: list[tuple[PageQuality, PageDecision, PageDecision]] = []
    cache = WordCache()
    with PdfFile(entry.file) as pdf:
        for index in range(pdf.page_count):
            content = pdf.page_content(index, settings.max_page_chars, settings.max_page_rects)
            raster = pdf.render_grayscale(
                index, settings.render_dpi, content.rects, settings.max_render_pixels
            )
            quality = measure_page(
                content, raster, wordlists, ["de", "en"], settings.word_validity_min_tokens, cache
            )
            pages.append(
                (
                    quality,
                    decide_page(quality, "auto", settings),
                    decide_page(quality, "auto", table_off),
                )
            )
    on = {index: page[1] for index, page in enumerate(pages)}
    off = {index: page[2] for index, page in enumerate(pages)}
    apply_document_shortcut(on, settings.document_ocr_share)
    apply_document_shortcut(off, settings.document_ocr_share)
    return [(quality, on[index], off[index]) for index, (quality, _, _) in enumerate(pages)]


def run(corpus: Path, price_per_page: float, out: Any = sys.stdout) -> dict[str, CategorySummary]:
    settings = Settings()
    wordlists = WordLists(Path(settings.word_lists_dir) if settings.word_lists_dir else None)
    if not wordlists.available(["de", "en"]):
        print("warning: no word lists found, wordValidity is not evaluated", file=out)
    summaries: dict[str, CategorySummary] = defaultdict(CategorySummary)
    target = corpus / f"decisions-{RULE_VERSION.replace('/', '-')}.csv"
    with target.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS)
        writer.writeheader()
        for entry in load_entries(corpus):
            summary = summaries[entry.category]
            for index, (quality, on, off) in enumerate(analyse_entry(entry, settings, wordlists)):
                expected = expected_for_page(entry, index)
                _record(summary, on, off, expected)
                writer.writerow(_row(entry, index, quality, on, off, expected))
    _print_summary(summaries, price_per_page, target, out)
    return summaries


def _record(
    summary: CategorySummary, on: PageDecision, off: PageDecision, expected: bool | None
) -> None:
    summary.pages += 1
    summary.ocr_on += on.method == "ocr"
    summary.ocr_off += off.method == "ocr"
    summary.blank += on.method == "blank"
    if on.ocr_reason:
        summary.reasons[on.ocr_reason] += 1
    if expected is True:
        summary.expected_ocr += 1
        summary.expected_found += on.method == "ocr"
    elif expected is False:
        summary.expected_text += 1
        summary.expected_text_kept += on.method != "ocr"


def _row(
    entry: Entry,
    index: int,
    quality: PageQuality,
    on: PageDecision,
    off: PageDecision,
    expected: bool | None,
) -> dict[str, Any]:
    return {
        "file": str(entry.file),
        "category": entry.category,
        "page": index,
        "method": on.method,
        "ocrReason": on.ocr_reason or "",
        "rule": on.rule,
        "methodTableOff": off.method,
        "charCount": quality.char_count,
        "inkRatio": quality.ink_ratio,
        "textInkCoverage": quality.text_ink_coverage,
        "garbageRatio": quality.garbage_ratio,
        "wordValidity": "" if quality.word_validity is None else quality.word_validity,
        "tableLikelihood": quality.table_likelihood,
        "expectedOcr": "" if expected is None else str(expected).lower(),
    }


def _print_summary(
    summaries: dict[str, CategorySummary], price_per_page: float, target: Path, out: Any
) -> None:
    print(f"rule {RULE_VERSION}; decisions written to {target}", file=out)
    header = (
        f"{'category':24} {'pages':>6} {'ocr':>6} {'ocr%':>6} {'off%':>6} "
        f"{'blank':>6} {'recall':>7} {'cost':>8}  reasons"
    )
    print(header, file=out)
    total_pages = total_ocr = 0
    for category, summary in sorted(summaries.items()):
        total_pages += summary.pages
        total_ocr += summary.ocr_on
        recall = (
            f"{summary.expected_found / summary.expected_ocr:.3f}" if summary.expected_ocr else "-"
        )
        reasons = ", ".join(f"{k}={v}" for k, v in sorted(summary.reasons.items()))
        print(
            f"{category:24} {summary.pages:>6} {summary.ocr_on:>6} "
            f"{_share(summary.ocr_on, summary.pages):>6} "
            f"{_share(summary.ocr_off, summary.pages):>6} "
            f"{summary.blank:>6} {recall:>7} {summary.ocr_on * price_per_page:>8.3f}  {reasons}",
            file=out,
        )
    print(
        f"{'total':24} {total_pages:>6} {total_ocr:>6} {_share(total_ocr, total_pages):>6}"
        f"{'':>14} {total_ocr * price_per_page:>16.3f}",
        file=out,
    )


def _share(part: int, whole: int) -> str:
    return f"{100 * part / whole:.1f}" if whole else "-"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--corpus", default=os.environ.get("CORPUS_DIR"))
    parser.add_argument("--price-per-page", type=float, default=0.001)
    args = parser.parse_args(argv)
    if not args.corpus:
        parser.error("set CORPUS_DIR or pass --corpus")
    corpus = Path(args.corpus)
    if not corpus.is_dir():
        parser.error(f"{corpus} is not a directory")
    run(corpus, args.price_per_page)
    return 0


if __name__ == "__main__":
    sys.exit(main())
