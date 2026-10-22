"""Email and text input: one page in the backend's flattened shape (contract §4).

An `.eml` carries its attachments' text the way the backend's `RetrieveFileContentUseCase` did:
one `--- Attachment: name ---` section per extractable attachment, at most
`MAX_EMAIL_ATTACHMENTS` of them within `EMAIL_ATTACHMENT_BUDGET_SECONDS`, attached emails one
level deep. Documents inside an email run through the same conversion, analysis and OCR as a
direct upload, in memory: a restart redoes the email, bounded like the in-process path was.
"""

import logging
import time
from pathlib import Path

from app.config import RULE_VERSION
from app.email.eml import EmailAttachment, parse_eml
from app.email.msg import parse_msg_bounded
from app.errors import ServiceError
from app.jobs.extractors import (
    OFFICE_TYPES,
    TEXT_TYPES,
    DownloadedInput,
    detect_type,
    register_extractor,
)
from app.jobs.result_writer import write_result
from app.jobs.runtime import JobContext
from app.office.extractor import convert_inline
from app.pdf.extractor import extract_pdf_inline
from app.result import DocumentInfo, ExtractionResult, PageEntry, Timings, strip_nul

logger = logging.getLogger(__name__)

MAX_ATTACHED_EMAIL_DEPTH = 1
EXTRACTABLE_ATTACHMENT_TYPES = frozenset({"pdf", "eml", "msg"}) | OFFICE_TYPES | TEXT_TYPES


def extract_text_file(context: JobContext, downloaded: DownloadedInput) -> None:
    context.set_phase("extracting")
    finish_single_page(context, downloaded, decode_text(downloaded.path.read_bytes()), [])


def extract_eml(context: JobContext, downloaded: DownloadedInput) -> None:
    context.set_phase("extracting")
    parsed = parse_eml(downloaded.path.read_bytes())
    warnings: list[str] = []
    if parsed.truncated:
        warnings.append("email_attachments_truncated")
    sections = [parsed.text, *extract_attachments(context, parsed.attachments, 0, warnings)]
    finish_single_page(context, downloaded, "\n\n".join(sections), warnings)


def extract_msg(context: JobContext, downloaded: DownloadedInput) -> None:
    context.set_phase("extracting")
    finish_single_page(context, downloaded, parse_msg(context, downloaded.path), [])


def parse_msg(context: JobContext, path: Path) -> str:
    settings = context.settings
    return parse_msg_bounded(
        path, settings.msg_parse_timeout_seconds, settings.msg_parse_memory_bytes
    )


def decode_text(data: bytes) -> str:
    return data.decode("utf-8", "replace").removeprefix("﻿")


def extract_attachments(
    context: JobContext, attachments: list[EmailAttachment], depth: int, warnings: list[str]
) -> list[str]:
    if depth >= MAX_ATTACHED_EMAIL_DEPTH:
        return []
    sections: list[str] = []
    started = time.monotonic()
    scratch = context.scratch / "attachments"
    scratch.mkdir(exist_ok=True)
    # Sequential so one email cannot fan out a burst of OCR requests; the stop check before
    # every part keeps a cancel, release, lost lease, shutdown or job timeout observed.
    for position, attachment in enumerate(attachments):
        context.check()
        path = scratch / str(position)
        path.write_bytes(attachment.content)
        detected = detect_type(path, attachment.content_type, attachment.filename)
        if detected not in EXTRACTABLE_ATTACHMENT_TYPES:
            path.unlink()
            continue
        note = skip_note(context, len(sections), started)
        if note is None:
            content = extract_attachment(context, path, attachment, detected, depth, warnings)
        else:
            content = note
            warnings.append("email_attachments_skipped")
        sections.append(f"--- Attachment: {attachment.filename} ---\n{content}")
        path.unlink(missing_ok=True)
    return sections


def skip_note(context: JobContext, extracted: int, started: float) -> str | None:
    settings = context.settings
    if extracted >= settings.max_email_attachments:
        return (
            f"[Content not extracted: only the first {settings.max_email_attachments} "
            "attachments of an email are extracted.]"
        )
    if time.monotonic() - started >= settings.email_attachment_budget_seconds:
        return (
            "[Content not extracted: the time available for extracting this email's "
            "attachments ran out.]"
        )
    return None


def extract_attachment(
    context: JobContext,
    path: Path,
    attachment: EmailAttachment,
    detected: str,
    depth: int,
    warnings: list[str],
) -> str:
    """The attachment's text, or a note when the document itself cannot be read.

    An outage (retryable failure) propagates and fails the job, so the backend retries the
    whole email instead of indexing it without the attachment.
    """
    context.check()
    try:
        return extract_attachment_content(context, path, attachment, detected, depth, warnings)
    except ServiceError as error:
        if error.retryable:
            raise
        logger.warning(
            "email attachment not extracted",
            extra={"jobId": context.job_id, "fileName": attachment.filename, "code": error.code},
        )
        warnings.append("email_attachment_unreadable")
        # Only the page-limit message is shown; other failures may carry internals.
        if error.code == "TOO_MANY_PAGES":
            return f"[Content could not be extracted: {error.message}]"
        return "[Content could not be extracted.]"


def extract_attachment_content(
    context: JobContext,
    path: Path,
    attachment: EmailAttachment,
    detected: str,
    depth: int,
    warnings: list[str],
) -> str:
    if detected in TEXT_TYPES:
        return decode_text(attachment.content)
    if detected == "eml":
        parsed = parse_eml(attachment.content)
        if parsed.truncated:
            warnings.append("email_attachments_truncated")
        nested = extract_attachments(context, parsed.attachments, depth + 1, warnings)
        return "\n\n".join([parsed.text, *nested])
    if detected == "msg":
        return parse_msg(context, path)
    if detected in OFFICE_TYPES:
        converted = path.with_name(f"{path.name}.pdf")
        convert_inline(context, path, attachment.filename, detected, converted)
        path = converted
    extraction = extract_pdf_inline(context, path)
    warnings.extend(extraction.warnings)
    return "\n".join(page.text for page in extraction.pages)


def finish_single_page(
    context: JobContext, downloaded: DownloadedInput, text: str, warnings: list[str]
) -> None:
    context.set_phase("finalizing")
    if text.strip() == "":
        raise ServiceError("EMPTY_DOCUMENT", "The document has no text")
    started = context.started_at
    result = ExtractionResult(
        job_id=context.job_id,
        idempotency_key=context.request.idempotency_key,
        document=DocumentInfo(
            file_name=context.request.file_name,
            declared_mime_type=context.request.declared_mime_type,
            detected_type=downloaded.detected_type,
            page_count=1,
            rule_version=RULE_VERSION,
            pages_text=1,
            warnings=sorted(set(warnings)),
            timings=Timings(
                download_ms=downloaded.download_ms,
                total_ms=int((time.monotonic() - started) * 1000),
            ),
        ),
        pages=[PageEntry(index=0, number=1, text=strip_nul(text), method="text")],
    )
    write_result(context, result)


def register_email_extractors() -> None:
    register_extractor("eml", extract_eml)
    register_extractor("msg", extract_msg)
    for detected_type in TEXT_TYPES:
        register_extractor(detected_type, extract_text_file)
