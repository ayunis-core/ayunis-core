"""Office input: Gotenberg makes a PDF, the PDF path does the rest (contract §1.1, §6)."""

import logging
import time
from pathlib import Path

from app.convert.gotenberg import CONVERTER_NAME, GotenbergConverter, resolve_converter
from app.errors import ServiceError
from app.jobs.abortable import call_abortable
from app.jobs.extractors import OFFICE_TYPES, DownloadedInput, register_extractor
from app.jobs.runtime import JobContext
from app.pdf.extractor import PdfSource, extract_pdf_document
from app.storage.objects import ObjectRef

logger = logging.getLogger(__name__)

CONVERTED_KEY = "converted.pdf"


def extract_office(context: JobContext, downloaded: DownloadedInput) -> None:
    context.set_phase("converting")
    target = context.scratch / CONVERTED_KEY
    conversion_ms = obtain_pdf(context, downloaded.path, downloaded.detected_type, target)
    extract_pdf_document(
        context,
        PdfSource(
            target,
            downloaded.detected_type,
            download_ms=downloaded.download_ms,
            conversion_ms=conversion_ms,
            converter=CONVERTER_NAME,
        ),
    )


def obtain_pdf(context: JobContext, source: Path, detected_type: str, target: Path) -> int:
    """Converts, or reuses the PDF an earlier run of this job stored under the prefix.

    Checked on every run, not only on a counted retry or restart: a job yielded by a graceful
    shutdown comes back with the same attempt and restart counters. Returns the conversion time,
    zero when the stored PDF was reused.
    """
    stored = ObjectRef(
        context.request.output.bucket, f"{context.request.output.key_prefix}{CONVERTED_KEY}"
    )
    max_bytes = context.settings.max_input_bytes
    if reuse_stored_pdf(context, stored, target, max_bytes):
        logger.info("converted PDF reused", extra={"jobId": context.job_id})
        return 0
    converter = require_converter(context)
    started = time.perf_counter()
    size = call_abortable(
        context,
        converter.call(
            source, _conversion_name(context.request.file_name, detected_type), target, max_bytes
        ),
    )
    conversion_ms = int((time.perf_counter() - started) * 1000)
    context.metrics.record_stage("conversion", conversion_ms)
    logger.info(
        "conversion done",
        extra={
            "jobId": context.job_id,
            "detectedType": detected_type,
            "pdfBytes": size,
            "conversionMs": conversion_ms,
        },
    )
    context.check()
    context.objects.put_file(stored, target, "application/pdf")
    return conversion_ms


def reuse_stored_pdf(context: JobContext, stored: ObjectRef, target: Path, max_bytes: int) -> bool:
    """Downloads the PDF an earlier run stored, unless there is none or it is over the budget
    (then it is removed so no later run reloads it)."""
    try:
        size = context.objects.object_size(stored)
    except ServiceError as error:
        if error.code == "INPUT_NOT_FOUND":
            return False
        raise
    if size > max_bytes:
        context.objects.delete(stored)
        raise ServiceError(
            "INPUT_TOO_LARGE",
            f"The stored converted PDF is {size} bytes, limit {max_bytes}",
            details={"bytes": size, "maxBytes": max_bytes},
        )
    return context.objects.get_file(stored, target)


def convert_inline(
    context: JobContext, source: Path, file_name: str, detected_type: str, target: Path
) -> None:
    """Conversion for a document inside an email: nothing is stored under the prefix."""
    converter = require_converter(context)
    started = time.perf_counter()
    call_abortable(
        context,
        converter.call(
            source,
            _conversion_name(file_name, detected_type),
            target,
            context.settings.max_input_bytes,
        ),
    )
    context.metrics.record_stage("conversion", int((time.perf_counter() - started) * 1000))


def require_converter(context: JobContext) -> GotenbergConverter:
    converter = resolve_converter(context.settings)
    if converter is None:
        raise ServiceError(
            "CONVERSION_UNAVAILABLE",
            "GOTENBERG_URL is not configured",
            retryable=True,
            details={"reason": "not_configured"},
        )
    return converter


def _conversion_name(file_name: str, detected_type: str) -> str:
    """LibreOffice picks the import filter from the extension, so the detected type sets it."""
    stem = Path(file_name).stem or "document"
    return f"{stem}.{detected_type}"


def register_office_extractor() -> None:
    for detected_type in OFFICE_TYPES:
        register_extractor(detected_type, extract_office)
