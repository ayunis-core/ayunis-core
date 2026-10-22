import csv
import io
import shutil
from pathlib import Path

import pytest

from scripts import validate_corpus
from tests.conftest import FIXTURES

PDFS = FIXTURES / "pdf"


def corpus_with_manifest(tmp_path: Path) -> Path:
    corpus = tmp_path / "corpus"
    for category, name in [
        ("born-digital", "born-digital.pdf"),
        ("scan-no-text", "scan-no-text.pdf"),
        ("scan-copier-ocr", "poor-ocr-layer.pdf"),
        ("tables", "table.pdf"),
        ("mixed", "mixed.pdf"),
    ]:
        (corpus / category).mkdir(parents=True, exist_ok=True)
        shutil.copy(PDFS / name, corpus / category / name)
    (corpus / "manifest.yaml").write_text(
        "\n".join(
            [
                "- file: born-digital/born-digital.pdf",
                "  category: born-digital",
                "  expected: {ocrPages: none}",
                "- file: scan-no-text/scan-no-text.pdf",
                "  category: scan-no-text",
                "  expected: {ocrPages: all}",
                "- file: scan-copier-ocr/poor-ocr-layer.pdf",
                "  category: scan-copier-ocr",
                "  expected: {ocrPages: all}",
                "- file: tables/table.pdf",
                "  category: tables",
                "  expected: {ocrPages: [0]}",
                "- file: mixed/mixed.pdf",
                "  category: mixed",
                "  expected: {ocrPages: [1]}",
                "",
            ]
        )
    )
    return corpus


def test_harness_records_every_page_and_meets_the_contract_acceptance(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("WORD_LISTS_DIR", str(FIXTURES / "wordlists"))
    corpus = corpus_with_manifest(tmp_path)
    out = io.StringIO()

    summaries = validate_corpus.run(corpus, price_per_page=0.001, out=out)

    rows = list(csv.DictReader((corpus / "decisions-ocr-rule-1.csv").open()))
    assert len(rows) == 3 + 2 + 2 + 1 + 3
    assert rows[0]["file"].endswith("born-digital.pdf")
    assert set(rows[0]) == set(validate_corpus.COLUMNS)
    assert summaries["born-digital"].ocr_on == 0
    assert summaries["scan-no-text"].expected_found == 2
    assert summaries["scan-copier-ocr"].expected_found == 2
    assert summaries["tables"].ocr_on == 1
    assert summaries["tables"].ocr_off == 0
    assert summaries["mixed"].expected_text_kept == 2
    recall_pages = sum(s.expected_ocr for s in summaries.values())
    recall_found = sum(s.expected_found for s in summaries.values())
    assert recall_found / recall_pages >= 0.98
    assert "born-digital" in out.getvalue()
    assert "cost" in out.getvalue()


def test_harness_without_a_manifest_uses_the_directory_as_category(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("WORD_LISTS_DIR", str(FIXTURES / "wordlists"))
    corpus = tmp_path / "plain"
    (corpus / "letters").mkdir(parents=True)
    shutil.copy(PDFS / "born-digital.pdf", corpus / "letters" / "a.pdf")

    summaries = validate_corpus.run(corpus, price_per_page=0.001, out=io.StringIO())

    assert list(summaries) == ["letters"]
    assert summaries["letters"].pages == 3


def test_main_requires_a_corpus_directory(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("CORPUS_DIR", raising=False)
    with pytest.raises(SystemExit):
        validate_corpus.main([])
    with pytest.raises(SystemExit):
        validate_corpus.main(["--corpus", str(tmp_path / "missing")])
