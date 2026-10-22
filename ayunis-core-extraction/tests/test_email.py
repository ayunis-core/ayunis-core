"""Email and text input: the backend's flattened shape, attachments, and the .msg bounds.

`<fixture>.backend.txt` is what the backend's own `parseEml` / `extractTextFromMsg` produced for
the fixture (exported with a throwaway jest spec); `<fixture>.expected.txt` is the service's
output. Where the two differ the test says why.
"""

import sys
import threading
from pathlib import Path

import httpx
import pytest

from app.config import Settings
from app.convert import gotenberg
from app.email.eml import parse_eml
from app.email.msg import extract_text_from_msg, parse_msg_bounded
from app.errors import ServiceError
from app.jobs.pipeline import run_job
from app.jobs.runtime import JobContext
from app.jobs.store import JobStore
from app.pdf import extractor
from app.result import ExtractionResult
from tests.conftest import FIXTURES, InMemoryObjectStore, make_context, start_request

EMAIL = FIXTURES / "email"
TEXT = FIXTURES / "text"
PREFIX = start_request().output.key_prefix
MIME_TYPES = {
    ".eml": "message/rfc822",
    ".msg": "application/vnd.ms-outlook",
    ".txt": "text/plain",
    ".md": "text/markdown",
}


def run_fixture(
    store: JobStore,
    objects: InMemoryObjectStore,
    settings: Settings,
    tmp_path: Path,
    path: Path,
    **options: object,
) -> tuple[JobContext, ExtractionResult]:
    sha256 = objects.put(f"org/processing/src/{path.name}", path.read_bytes())
    context = make_context(
        store,
        objects,
        settings,
        tmp_path,
        start_request(
            key=f"org/processing/src/{path.name}",
            sha256=sha256,
            file_name=path.name,
            declared_mime_type=MIME_TYPES[path.suffix],
            **options,  # type: ignore[arg-type]
        ),
    )
    run_job(context)
    raw = objects.objects[("ayunis", f"{PREFIX}result.json")]
    return context, ExtractionResult.model_validate_json(raw)


def expected(path: Path) -> str:
    """Read as bytes: the recorded output keeps the CRLF line ends of PDF text and uploads."""
    return (path.parent / f"{path.name}.expected.txt").read_bytes().decode("utf-8")


def backend(path: Path) -> str:
    return (path.parent / f"{path.name}.backend.txt").read_bytes().decode("utf-8")


@pytest.mark.parametrize(
    "name", ["plain.eml", "html-only.eml", "latin1.eml", "nested.eml", "with-attachments.eml"]
)
def test_eml_header_and_body_match_the_backend_output(name: str) -> None:
    assert parse_eml((EMAIL / name).read_bytes()).text == backend(EMAIL / name)


@pytest.mark.parametrize(
    "name", ["plain.msg", "latin1-html.msg", "cp932-subject.msg", "not-outlook.msg"]
)
def test_msg_output_matches_the_backend_output(name: str) -> None:
    try:
        text = extract_text_from_msg(EMAIL / name)
    except Exception as error:
        text = f"ERROR: {error}"
    assert text == backend(EMAIL / name)


def test_msg_html_bodies_keep_their_block_structure() -> None:
    """The backend flattens HTML with `textContent`; the service renders blocks like mailparser
    does for .eml, so an HTML-only Outlook message reads the same as the .eml it would be."""
    assert backend(EMAIL / "html-only.msg").endswith("Hallo Welt\nZweiter Absatz")
    assert extract_text_from_msg(EMAIL / "html-only.msg").endswith("Hallo Welt\n\nZweiter Absatz")


def test_msg_windows_1252_html_is_decoded_with_its_codepage() -> None:
    """The backend's spec for this case fails today (0x80 comes back as U+0080, not the euro
    sign); the service decodes it as the message's codepage says."""
    assert backend(EMAIL / "cp1252-body.msg") == "\x80 50"
    assert extract_text_from_msg(EMAIL / "cp1252-body.msg") == "€ 50"


@pytest.mark.parametrize("name", ["plain.eml", "plain.msg", "html-only.eml"])
def test_emails_without_extractable_attachments_are_one_page(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path, name: str
) -> None:
    context, result = run_fixture(store, objects, settings, tmp_path, EMAIL / name)

    status = store.status(context.job_id)
    assert status is not None and status.state == "succeeded"
    assert status.progress.model_dump() == {
        "pages_total": 1,
        "pages_done": 1,
        "pages_ocr": 0,
        "pages_text": 1,
    }
    assert result.document.detected_type == name.split(".")[1]
    assert result.document.page_count == 1
    assert result.document.converter is None
    assert [page.method for page in result.pages] == ["text"]
    assert result.pages[0].text == expected(EMAIL / name)
    assert result.pages[0].text == backend(EMAIL / name)


def test_attachments_are_extracted_in_order_after_the_message(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    path = EMAIL / "with-attachments.eml"

    _, result = run_fixture(store, objects, settings, tmp_path, path)

    text = result.pages[0].text
    assert text.startswith(backend(path))
    assert text == expected(path)
    sections = text.split("\n\n--- Attachment: ")
    assert [section.split(" ---")[0] for section in sections[1:]] == ["notiz.txt", "bericht.pdf"]
    assert "Anhangstext mit Umlauten: äöü" in sections[1]
    assert "Beschlussvorlage 2" in sections[2]
    assert result.document.warnings == []


def test_an_attached_email_is_flattened_but_its_own_attachments_only_listed(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    _, result = run_fixture(store, objects, settings, tmp_path, EMAIL / "nested.eml")

    text = result.pages[0].text
    assert text == expected(EMAIL / "nested.eml")
    assert '--- Attachment: weiterleitung.eml ---\nFrom: "Dave"' in text
    assert "Attachments: tief.txt" in text
    assert "Text in der zweiten Ebene" not in text


def test_office_attachments_are_converted_and_pdf_attachments_ocr_when_needed(
    store: JobStore,
    objects: InMemoryObjectStore,
    settings: Settings,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        gotenberg,
        "default_client",
        lambda url, timeout: httpx.Client(
            base_url=url,
            transport=httpx.MockTransport(
                lambda request: httpx.Response(
                    200, content=(FIXTURES / "pdf" / "rotated.pdf").read_bytes()
                )
            ),
        ),
    )
    eml = _email_with(
        [
            ("vorlage.docx", "application/octet-stream", (FIXTURES / "office" / "letter.docx")),
            ("scan.pdf", "application/pdf", FIXTURES / "pdf" / "scan-no-text.pdf"),
        ]
    )
    path = tmp_path / "office-attachments.eml"
    path.write_bytes(eml)

    context, result = run_fixture(
        store,
        objects,
        settings.model_copy(update={"gotenberg_url": "http://gotenberg:3000"}),
        tmp_path / "job",
        path,
    )

    text = result.pages[0].text
    assert "--- Attachment: vorlage.docx ---\nGedrehte Seite" in text
    assert "--- Attachment: scan.pdf ---\n[fake-ocr" in text
    assert result.document.page_count == 1
    # The attachments' OCR counts as pages sent, not as pages of the email.
    assert context.metrics.ocr_pages_sent == 2
    assert (context.metrics.pages_total, context.metrics.pages_ocr) == (1, 0)


def test_unreadable_attachments_leave_a_note_and_a_warning(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    eml = _email_with(
        [
            ("kaputt.pdf", "application/pdf", None, b"%PDF-1.4 not really a pdf"),
            ("lang.pdf", "application/pdf", FIXTURES / "pdf" / "born-digital.pdf"),
        ]
    )
    path = tmp_path / "broken.eml"
    path.write_bytes(eml)

    _, result = run_fixture(store, objects, settings, tmp_path / "job", path, max_pages=2)

    text = result.pages[0].text
    assert "--- Attachment: kaputt.pdf ---\n[Content could not be extracted.]" in text
    assert (
        "--- Attachment: lang.pdf ---\n[Content could not be extracted: "
        "The PDF has 3 pages, the limit is 2]"
    ) in text
    assert result.document.warnings == ["email_attachment_unreadable"]


def test_attachment_limits_mirror_the_backend_notes(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    eml = _email_with(
        [
            ("a.txt", "text/plain", None, b"erster"),
            ("b.txt", "text/plain", None, b"zweiter"),
            ("c.txt", "text/plain", None, b"dritter"),
        ]
    )
    path = tmp_path / "many.eml"
    path.write_bytes(eml)

    _, result = run_fixture(
        store,
        objects,
        settings.model_copy(update={"max_email_attachments": 1}),
        tmp_path / "job",
        path,
    )

    text = result.pages[0].text
    assert "--- Attachment: a.txt ---\nerster" in text
    assert (
        "--- Attachment: b.txt ---\n[Content not extracted: only the first 1 attachments of an "
        "email are extracted.]"
    ) in text
    assert result.document.warnings == ["email_attachments_skipped"]


def test_a_provider_outage_inside_an_attachment_fails_the_job_retryably(
    store: JobStore,
    objects: InMemoryObjectStore,
    settings: Settings,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class Broken:
        model = "broken"

        def call(self, pdf_bytes: bytes, page_count: int, check: object = None) -> object:
            raise ServiceError("OCR_UNAVAILABLE", "down", retryable=True)

    monkeypatch.setattr(extractor, "resolve_ocr_backend", lambda _settings: Broken())
    path = tmp_path / "scan.eml"
    path.write_bytes(
        _email_with([("scan.pdf", "application/pdf", FIXTURES / "pdf" / "scan-no-text.pdf")])
    )

    with pytest.raises(ServiceError) as failure:
        run_fixture(store, objects, settings, tmp_path / "job", path)

    assert failure.value.code == "OCR_UNAVAILABLE"
    assert failure.value.retryable is True


@pytest.mark.parametrize("name", ["notes.txt", "notes.md"])
def test_text_files_pass_through_as_one_page(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path, name: str
) -> None:
    _, result = run_fixture(store, objects, settings, tmp_path, TEXT / name)

    assert result.document.detected_type == name.split(".")[1]
    assert result.pages[0].text == expected(TEXT / name)
    assert not result.pages[0].text.startswith("﻿")


def test_an_empty_text_file_is_an_empty_document(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    path = tmp_path / "leer.txt"
    path.write_bytes(b"\xef\xbb\xbf  \r\n")

    with pytest.raises(ServiceError) as failure:
        run_fixture(store, objects, settings, tmp_path / "job", path)

    assert failure.value.code == "EMPTY_DOCUMENT"


@pytest.mark.parametrize(
    ("data", "reason"),
    [(b"not an outlook message", "parse_error"), (b"", "parse_error")],
)
def test_files_that_are_not_outlook_messages_are_unprocessable(
    store: JobStore,
    objects: InMemoryObjectStore,
    settings: Settings,
    tmp_path: Path,
    data: bytes,
    reason: str,
) -> None:
    path = tmp_path / "x.msg"
    path.write_bytes(data)

    with pytest.raises(ServiceError) as failure:
        run_fixture(store, objects, settings, tmp_path / "job", path)

    assert failure.value.code == "UNPROCESSABLE_DOCUMENT"
    assert failure.value.details is not None
    assert failure.value.details["reason"] == reason


def test_a_compound_file_that_is_not_an_email_is_unprocessable(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    with pytest.raises(ServiceError) as failure:
        run_fixture(store, objects, settings, tmp_path, EMAIL / "not-outlook.msg")

    assert failure.value.code == "UNPROCESSABLE_DOCUMENT"
    assert failure.value.details == {
        "reason": "parse_error",
        "message": "NotAnOutlookMessageError: Not an Outlook message",
    }


def test_msg_parsing_that_exceeds_the_deadline_is_the_documents_fault() -> None:
    with pytest.raises(ServiceError) as failure:
        parse_msg_bounded(EMAIL / "plain.msg", timeout_seconds=0.001, memory_bytes=1 << 30)

    assert failure.value.code == "UNPROCESSABLE_DOCUMENT"
    assert failure.value.details == {"reason": "timeout"}


@pytest.mark.skipif(sys.platform == "darwin", reason="RLIMIT_AS is not enforced on macOS")
def test_msg_parsing_that_exceeds_the_memory_cap_is_the_documents_fault() -> None:
    with pytest.raises(ServiceError) as failure:
        parse_msg_bounded(EMAIL / "plain.msg", timeout_seconds=30, memory_bytes=8 << 20)

    assert failure.value.code == "UNPROCESSABLE_DOCUMENT"
    assert failure.value.details is not None
    assert failure.value.details["reason"] in ("out_of_memory", "crash")


def test_msg_parsing_runs_in_a_child_process_bounded_by_the_settings(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    seen: dict[str, object] = {}

    def fake_run(command: list[str], **kwargs: object) -> object:
        seen["command"], seen["timeout"] = command, kwargs["timeout"]
        return type("Completed", (), {"returncode": 0, "stdout": b'{"text": "ok"}'})()

    monkeypatch.setattr("app.email.msg.subprocess.run", fake_run)

    assert parse_msg_bounded(tmp_path / "a.msg", 30.0, 256 * 1024 * 1024) == "ok"
    assert seen["timeout"] == 30.0
    command = seen["command"]
    assert isinstance(command, list)
    assert command[1:3] == ["-m", "app.email.msg_worker"]
    assert command[-1] == str(256 * 1024 * 1024)


def _email_with(
    attachments: list[tuple[str, str, Path | None] | tuple[str, str, Path | None, bytes]],
) -> bytes:
    import base64

    boundary = "----=_Test"
    lines = [
        "From: Alice <alice@example.com>",
        "Subject: Anhang",
        f'Content-Type: multipart/mixed; boundary="{boundary}"',
        "",
        f"--{boundary}",
        "Content-Type: text/plain; charset=utf-8",
        "",
        "Siehe Anhang.",
    ]
    for entry in attachments:
        name, content_type, path = entry[0], entry[1], entry[2]
        data = entry[3] if len(entry) == 4 else (path.read_bytes() if path else b"")
        lines += [
            f"--{boundary}",
            f"Content-Type: {content_type}",
            f'Content-Disposition: attachment; filename="{name}"',
            "Content-Transfer-Encoding: base64",
            "",
            base64.b64encode(data).decode(),
        ]
    lines.append(f"--{boundary}--")
    return ("\r\n".join(lines) + "\r\n").encode("utf-8")


def _unused(_: threading.Event) -> None: ...


def test_msg_html_stored_as_an_ansi_string_is_decoded(tmp_path: Path) -> None:
    """Non-Unicode Outlook stores PidTagHtml as PT_STRING8 in the message codepage: the
    latin1-html fixture's binary HTML stream renamed to the string type must read the same."""
    rewritten = _rename_stream(
        EMAIL / "latin1-html.msg", tmp_path, "__substg1.0_10130102", "__substg1.0_1013001E"
    )

    assert extract_text_from_msg(rewritten) == "Subject: Grüße\n\nGrüße für Köln"


def _rename_stream(path: Path, directory: Path, old: str, new: str) -> Path:
    """CFBF directory entries store the name as UTF-16LE; both names have the same length."""
    data = path.read_bytes()
    old_bytes, new_bytes = old.encode("utf-16-le"), new.encode("utf-16-le")
    assert len(old_bytes) == len(new_bytes)
    assert data.count(old_bytes) == 1
    renamed = directory / "renamed.msg"
    renamed.write_bytes(data.replace(old_bytes, new_bytes))
    return renamed


def test_a_message_of_many_named_parts_is_cut_and_the_walk_stays_cancellable(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    from app.email import eml as eml_module

    parts = [(f"p{index}.bin", "application/octet-stream", None, b"x") for index in range(1200)]
    path = tmp_path / "crowded.eml"
    path.write_bytes(_email_with(parts))  # type: ignore[arg-type]

    parsed = parse_eml(path.read_bytes())
    assert len(parsed.attachments) == eml_module.DEFAULT_MAX_ATTACHMENTS
    assert parsed.truncated is True

    _, result = run_fixture(store, objects, settings, tmp_path / "job", path)
    assert result.document.warnings == ["email_attachments_truncated"]
    assert "--- Attachment:" not in result.pages[0].text


def test_cancel_during_the_attachment_walk_interrupts_the_job(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    from app.jobs.runtime import JobInterruptedError

    parts = [(f"n{index}.txt", "text/plain", None, b"text") for index in range(30)]
    path = tmp_path / "walk.eml"
    path.write_bytes(_email_with(parts))  # type: ignore[arg-type]
    sha256 = objects.put("org/processing/src/walk.eml", path.read_bytes())
    context = make_context(
        store,
        objects,
        settings,
        tmp_path / "job",
        start_request(
            key="org/processing/src/walk.eml",
            sha256=sha256,
            file_name="walk.eml",
            declared_mime_type="message/rfc822",
        ),
    )
    store.cancel(context.job_id)

    with pytest.raises(JobInterruptedError) as interrupted:
        run_job(context)

    assert interrupted.value.reason == "cancelled"


def test_msg_with_an_out_of_range_filetime_still_parses(tmp_path: Path) -> None:
    """Outlook sentinels past year 9999 are dropped, not fatal; the message keeps its subject."""
    source = (EMAIL / "plain.msg").read_bytes()
    with_date = extract_text_from_msg(EMAIL / "plain.msg")
    assert "Date: 2026-08-12T10:00:00.000Z" in with_date
    # The submit time 0x0039 (PT_SYSTIME 0x0040) sits in the root properties stream as a 16-byte
    # entry: type then id little-endian, flags, 8-byte FILETIME. Overwrite the value with all ones.
    entry = bytes.fromhex("40003900")
    assert source.count(entry) == 1
    position = source.index(entry)
    crafted = source[: position + 8] + b"\xff" * 8 + source[position + 16 :]
    path = tmp_path / "sentinel.msg"
    path.write_bytes(crafted)

    text = extract_text_from_msg(path)

    assert "Subject: Anfrage zur Anmeldung" in text
    assert "Date:" not in text
