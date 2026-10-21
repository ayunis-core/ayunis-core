"""Registry of extractors by detected input type; `app.pdf.extractor` registers `pdf`."""

from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

from app.jobs.runtime import JobContext


@dataclass(frozen=True)
class DownloadedInput:
    path: Path
    size: int
    detected_type: str
    download_ms: int


Extractor = Callable[[JobContext, DownloadedInput], None]

EXTRACTORS: dict[str, Extractor] = {}


def register_extractor(detected_type: str, extractor: Extractor) -> None:
    EXTRACTORS[detected_type] = extractor


def detect_type(path: Path) -> str:
    with path.open("rb") as handle:
        head = handle.read(8)
    if head.startswith(b"%PDF"):
        return "pdf"
    return "unknown"
