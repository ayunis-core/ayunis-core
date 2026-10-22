"""Registry of extractors by detected input type, and the detection itself.

Binary formats are recognised by their bytes (PDF, zip-based Office, RTF, compound files);
`eml`, `txt` and `md` have no signature and follow the declared MIME type, then the extension,
the same order the backend's `detectFileType` uses.
"""

import zipfile
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

import olefile

from app.jobs.runtime import JobContext


@dataclass(frozen=True)
class DownloadedInput:
    path: Path
    size: int
    detected_type: str
    download_ms: int


Extractor = Callable[[JobContext, DownloadedInput], None]

EXTRACTORS: dict[str, Extractor] = {}

OFFICE_TYPES: frozenset[str] = frozenset({"docx", "pptx", "odt", "odp", "rtf"})
TEXT_TYPES: frozenset[str] = frozenset({"txt", "md"})

CFBF_SIGNATURE = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"
# An ODF `mimetype` member is a few dozen bytes; Office containers hold a few thousand parts.
MAX_ODF_MIMETYPE_BYTES = 256
MAX_ZIP_ENTRIES = 20_000

ODF_MIME_TYPES = {
    "application/vnd.oasis.opendocument.text": "odt",
    "application/vnd.oasis.opendocument.presentation": "odp",
    "application/vnd.oasis.opendocument.spreadsheet": "ods",
}
MIME_TO_TYPE = {
    "message/rfc822": "eml",
    "application/vnd.ms-outlook": "msg",
    "text/markdown": "md",
    "text/plain": "txt",
}
EXTENSION_TO_TYPE = {".eml": "eml", ".msg": "msg", ".md": "md", ".txt": "txt"}


def register_extractor(detected_type: str, extractor: Extractor) -> None:
    EXTRACTORS[detected_type] = extractor


def detect_type(path: Path, declared_mime_type: str = "", file_name: str = "") -> str:
    with path.open("rb") as handle:
        head = handle.read(8)
    if head.startswith(b"%PDF"):
        return "pdf"
    if head.startswith(b"PK\x03\x04"):
        return _detect_zip(path)
    if head.startswith(b"{\\rtf"):
        return "rtf"
    if head.startswith(CFBF_SIGNATURE):
        return _detect_compound(path)
    declared = MIME_TO_TYPE.get(declared_mime_type.split(";")[0].strip().lower())
    if declared is not None:
        return declared
    suffix = Path(file_name).suffix.lower()
    return EXTENSION_TO_TYPE.get(suffix, "unknown")


def _detect_zip(path: Path) -> str:
    """Looks at the central directory only; the `mimetype` member is read with a hard cap so a
    crafted archive cannot expand in this process (the compressed size bounds nothing)."""
    try:
        with zipfile.ZipFile(path) as archive:
            infos = archive.infolist()
            if len(infos) > MAX_ZIP_ENTRIES:
                return "unknown"
            names = [info.filename for info in infos]
            if "mimetype" in names:
                info = archive.getinfo("mimetype")
                if info.file_size > MAX_ODF_MIMETYPE_BYTES:
                    return "unknown"
                with archive.open(info) as member:
                    mime = member.read(MAX_ODF_MIMETYPE_BYTES).decode("ascii", "replace").strip()
                return ODF_MIME_TYPES.get(mime, "unknown")
    except (zipfile.BadZipFile, OSError, RuntimeError):
        return "unknown"
    if any(name.startswith("word/") for name in names):
        return "docx"
    if any(name.startswith("ppt/") for name in names):
        return "pptx"
    if any(name.startswith("xl/") for name in names):
        return "xlsx"
    return "unknown"


def _detect_compound(path: Path) -> str:
    try:
        with olefile.OleFileIO(str(path)) as ole:
            if ole.exists("__properties_version1.0"):
                return "msg"
            if ole.exists("WordDocument"):
                return "doc"
            if ole.exists("PowerPoint Document"):
                return "ppt"
            if ole.exists("Workbook"):
                return "xls"
    except (OSError, ValueError):
        return "unknown"
    return "unknown"
