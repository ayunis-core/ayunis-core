"""Outlook .msg (MS-OXMSG over CFBF) flattened like the backend's `extractTextFromMsg`.

Parsing runs in a child process bounded like the backend's piscina worker (AYC-1003): a few KB
of crafted CFBF can send a reader into unbounded allocation or a sector-chain loop, so the child
gets a memory cap and a deadline and its death is the document's fault, not an outage.
"""

import json
import struct
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from pathlib import Path

import olefile

from app.email.text import (
    build_header_lines,
    extract_body,
    format_address,
    iso_timestamp,
    join_sections,
)
from app.errors import ServiceError

PT_LONG = 0x0003
PT_SYSTIME = 0x0040
ROOT_PROPERTIES_HEADER = 32
CHILD_PROPERTIES_HEADER = 8
RECIPIENT_TYPES = {1: "to", 2: "cc"}
FILETIME_EPOCH = datetime(1601, 1, 1, tzinfo=UTC)

WINDOWS_ANSI_CODEPAGES = frozenset(
    {874, 932, 936, 949, 950, 1250, 1251, 1252, 1253, 1254, 1255, 1256, 1257, 1258}
)
ANSI_CODEPAGE_BY_INTERNET_CODEPAGE = {
    20127: 1252,
    28591: 1252,
    28605: 1252,
    28592: 1250,
    28595: 1251,
    20866: 1251,
    28597: 1253,
    28599: 1254,
    50220: 932,
    50221: 932,
    50222: 932,
    51932: 932,
    52936: 936,
    54936: 936,
    51949: 949,
}
HTML_ENCODING_BY_CODEPAGE = {
    874: "cp874",
    932: "shift_jis",
    936: "gbk",
    949: "euc_kr",
    950: "big5",
    1200: "utf-16-le",
    1201: "utf-16-be",
    20127: "ascii",
    20866: "koi8_r",
    21866: "koi8_u",
    28591: "iso-8859-1",
    28592: "iso-8859-2",
    28593: "iso-8859-3",
    28594: "iso-8859-4",
    28595: "iso-8859-5",
    28596: "iso-8859-6",
    28597: "iso-8859-7",
    28598: "iso-8859-8",
    28599: "iso-8859-9",
    28603: "iso-8859-13",
    28605: "iso-8859-15",
    50220: "iso-2022-jp",
    50221: "iso-2022-jp",
    50222: "iso-2022-jp",
    51932: "euc_jp",
    51949: "euc_kr",
    54936: "gb18030",
    65001: "utf-8",
}


class NotAnOutlookMessageError(Exception):
    pass


@dataclass
class _Storage:
    """One directory of the compound file: its string streams and fixed-length properties."""

    strings_unicode: dict[int, bytes] = field(default_factory=dict)
    strings_ansi: dict[int, bytes] = field(default_factory=dict)
    binaries: dict[int, bytes] = field(default_factory=dict)
    longs: dict[int, int] = field(default_factory=dict)
    times: dict[int, datetime] = field(default_factory=dict)

    def text(self, tag: int, ansi_encoding: str) -> str | None:
        unicode = self.strings_unicode.get(tag)
        if unicode is not None:
            return unicode.decode("utf-16-le", "replace")
        ansi = self.strings_ansi.get(tag)
        if ansi is not None:
            return ansi.decode(ansi_encoding, "replace")
        return None


def extract_text_from_msg(path: Path) -> str:
    """The flattened message; raises `NotAnOutlookMessageError` or olefile's own errors."""
    with olefile.OleFileIO(str(path)) as ole:
        root = _read_storage(ole, [], ROOT_PROPERTIES_HEADER)
        recipients = [
            _read_storage(ole, [name], CHILD_PROPERTIES_HEADER)
            for name in _child_storages(ole, "__recip_version1.0_#")
        ]
        attachments = [
            _read_storage(ole, [name], CHILD_PROPERTIES_HEADER)
            for name in _child_storages(ole, "__attach_version1.0_#")
        ]
    encoding = _ansi_encoding(root)
    if root.text(0x001A, encoding) is None:
        raise NotAnOutlookMessageError("Not an Outlook message")
    attachment_names = [
        name
        for storage in attachments
        if (name := storage.text(0x3707, encoding) or storage.text(0x3704, encoding))
    ]
    header = build_header_lines(
        [
            (
                "From",
                format_address(
                    root.text(0x0C1A, encoding),
                    root.text(0x5D01, encoding) or root.text(0x0C1F, encoding),
                ),
            ),
            ("To", _recipients(recipients, "to", encoding)),
            ("Cc", _recipients(recipients, "cc", encoding)),
            ("Subject", root.text(0x0037, encoding) or ""),
            ("Date", iso_timestamp(root.times.get(0x0039) or root.times.get(0x0E06))),
            ("Attachments", ", ".join(attachment_names)),
        ]
    )
    plain = root.text(0x1000, encoding)
    body = extract_body(plain.replace("\r\n", "\n") if plain else None, _html(root, encoding))
    return join_sections([header, body])


def parse_msg_bounded(path: Path, timeout_seconds: float, memory_bytes: int) -> str:
    """Runs `extract_text_from_msg` in a child process; any way it fails is UNPROCESSABLE."""
    try:
        completed = subprocess.run(
            [sys.executable, "-m", "app.email.msg_worker", str(path), str(memory_bytes)],
            capture_output=True,
            timeout=timeout_seconds,
            cwd=str(Path(__file__).resolve().parents[2]),
            check=False,
        )
    except subprocess.TimeoutExpired as error:
        raise _unreadable("timeout") from error
    if completed.returncode != 0:
        raise _unreadable("out_of_memory" if completed.returncode == 3 else "crash")
    try:
        outcome = json.loads(completed.stdout.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise _unreadable("crash") from error
    if "error" in outcome:
        raise _unreadable("parse_error", outcome["error"])
    text: str = outcome["text"]
    return text


def _unreadable(reason: str, message: str | None = None) -> ServiceError:
    details: dict[str, object] = {"reason": reason}
    if message:
        details["message"] = message[:200]
    return ServiceError(
        "UNPROCESSABLE_DOCUMENT", "The Outlook message could not be read", details=details
    )


def _child_storages(ole: "olefile.OleFileIO[str]", prefix: str) -> list[str]:
    names = {entry[0] for entry in ole.listdir(streams=False, storages=True) if len(entry) == 1}
    return sorted(name for name in names if name.startswith(prefix))


def _read_storage(ole: "olefile.OleFileIO[str]", base: list[str], header_size: int) -> _Storage:
    storage = _Storage()
    for entry in ole.listdir(streams=True, storages=False):
        if entry[:-1] != base:
            continue
        name = entry[-1]
        if name.startswith("__substg1.0_") and len(name) == 20:
            tag, kind = int(name[12:16], 16), name[16:20]
            data = ole.openstream(entry).read()
            if kind == "001F":
                storage.strings_unicode[tag] = data
            elif kind == "001E":
                storage.strings_ansi[tag] = data
            elif kind == "0102":
                storage.binaries[tag] = data
        elif name == "__properties_version1.0":
            _read_properties(ole.openstream(entry).read(), header_size, storage)
    return storage


def _read_properties(data: bytes, header_size: int, storage: _Storage) -> None:
    for offset in range(header_size, len(data) - 15, 16):
        kind, tag = struct.unpack_from("<HH", data, offset)
        if kind == PT_LONG:
            storage.longs[tag] = struct.unpack_from("<I", data, offset + 8)[0]
        elif kind == PT_SYSTIME:
            (filetime,) = struct.unpack_from("<Q", data, offset + 8)
            moment = _filetime(filetime)
            if moment is not None:
                storage.times[tag] = moment


def _filetime(value: int) -> datetime | None:
    """Outlook writes sentinels (never, far future) that do not fit Python's year 9999."""
    try:
        return FILETIME_EPOCH + timedelta(microseconds=value // 10)
    except (OverflowError, ValueError):
        return None


def _ansi_encoding(root: _Storage) -> str:
    """Non-Unicode strings are stored in the sender's ANSI codepage; Windows-1252 is the guess
    for the German-language mail Ayunis receives when the message records none."""
    codepage = root.longs.get(0x3FFD) or root.longs.get(0x3FDE)
    if codepage in WINDOWS_ANSI_CODEPAGES:
        return f"cp{codepage}"
    mapped = ANSI_CODEPAGE_BY_INTERNET_CODEPAGE.get(codepage or 0)
    return f"cp{mapped or 1252}"


def _recipients(storages: list[_Storage], kind: str, encoding: str) -> str:
    formatted = [
        format_address(
            storage.text(0x3001, encoding),
            storage.text(0x39FE, encoding) or storage.text(0x3003, encoding),
        )
        for storage in storages
        if RECIPIENT_TYPES.get(storage.longs.get(0x0C15, 0)) == kind
    ]
    return ", ".join(text for text in formatted if text)


def _html(root: _Storage, ansi_encoding: str) -> str | None:
    """PidTagHtml as a Unicode or ANSI string, or the binary stream in the internet codepage."""
    string = root.text(0x1013, ansi_encoding)
    if string is not None:
        return string
    binary = root.binaries.get(0x1013)
    if binary is None:
        return None
    codepage = root.longs.get(0x3FDE)
    if codepage is not None and 1250 <= codepage <= 1258:
        encoding = f"cp{codepage}"
    else:
        encoding = HTML_ENCODING_BY_CODEPAGE.get(codepage or 65001, "utf-8")
    return binary.decode(encoding, "replace")
