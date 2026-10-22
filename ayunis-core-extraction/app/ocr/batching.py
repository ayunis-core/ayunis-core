"""Groups OCR pages into sub-PDFs within the provider's page and size limits (contract §8.2)."""

from collections.abc import Iterator
from pathlib import Path

from app.pdf.document import PdfFile


def iter_batches(
    pdf: PdfFile, indices: list[int], max_pages: int, max_bytes: int, scratch: Path
) -> Iterator[tuple[list[int], Path]]:
    """Yields (page indices, sub-PDF path) in document order; a too-large batch is split in half."""
    pending = sorted(indices)
    batch_number = 0
    while pending:
        candidate = pending[: max(1, max_pages)]
        while True:
            batch_number += 1
            target = scratch / f"ocr-batch-{batch_number:04d}.pdf"
            size = pdf.write_subset(candidate, target)
            if size <= max_bytes or len(candidate) == 1:
                break
            target.unlink(missing_ok=True)
            candidate = candidate[: max(1, len(candidate) // 2)]
        pending = pending[len(candidate) :]
        yield candidate, target
