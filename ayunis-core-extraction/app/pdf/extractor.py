"""PDF extraction: count, analyse, extract text-layer pages, OCR the rest, write the result."""

import hashlib
import logging
import time
from dataclasses import dataclass, field

from app.api.models import JobProgress, ResultRef
from app.config import RULE_VERSION
from app.errors import ServiceError
from app.jobs.extractors import DownloadedInput, register_extractor
from app.jobs.runtime import JobContext, JobInterruptedError
from app.ocr.backend import OcrBackend, resolve_ocr_backend
from app.pdf.checkpoints import Checkpoints
from app.pdf.decision import PageDecision, decide_from_text
from app.pdf.document import PageContent, PdfFile
from app.result import (
    DocumentInfo,
    ExtractionResult,
    PageEntry,
    PageSize,
    Timings,
    strip_nul,
)
from app.storage.objects import ObjectRef

logger = logging.getLogger(__name__)


@dataclass
class PageAnalysis:
    index: int
    decision: PageDecision
    size: PageSize


@dataclass
class Run:
    context: JobContext
    pdf: PdfFile
    checkpoints: Checkpoints
    backend: OcrBackend | None
    warnings: list[str] = field(default_factory=list)
    timings: Timings = field(default_factory=Timings)
    started: float = field(default_factory=time.perf_counter)

    @property
    def page_count(self) -> int:
        return self.pdf.page_count

    def progress(self) -> JobProgress:
        pages = self.checkpoints.pages.values()
        return JobProgress(
            pages_total=self.page_count,
            pages_done=len(self.checkpoints.pages),
            pages_ocr=sum(1 for page in pages if page.method == "ocr"),
            pages_text=sum(1 for page in pages if page.method in ("text", "text_fallback")),
        )


def extract_pdf(context: JobContext, downloaded: DownloadedInput) -> None:
    context.set_phase("counting")
    with PdfFile(downloaded.path) as pdf:
        run = Run(context, pdf, Checkpoints(context), resolve_ocr_backend(context.settings))
        run.timings.download_ms = downloaded.download_ms
        check_page_limit(run)
        run.checkpoints.load_existing(run.page_count)
        context.report_progress(run.progress())

        context.set_phase("analyzing")
        analysis_started = time.perf_counter()
        analyses = analyse_pages(run)
        run.timings.analysis_ms = int((time.perf_counter() - analysis_started) * 1000)

        context.set_phase("extracting")
        pending_ocr = extract_text_pages(run, analyses)
        ocr_started = time.perf_counter()
        extract_ocr_pages(run, analyses, pending_ocr)
        run.timings.ocr_ms = int((time.perf_counter() - ocr_started) * 1000)

        context.set_phase("finalizing")
        finalize(run, downloaded)


def check_page_limit(run: Run) -> None:
    max_pages = run.context.request.options.max_pages or run.context.settings.max_pages
    if run.page_count == 0:
        raise ServiceError("EMPTY_DOCUMENT", "The PDF has no pages")
    if run.page_count > max_pages:
        raise ServiceError(
            "TOO_MANY_PAGES",
            f"The PDF has {run.page_count} pages, the limit is {max_pages}",
            details={"pageCount": run.page_count, "maxPages": max_pages},
        )


def analyse_pages(run: Run) -> dict[int, PageAnalysis]:
    """Decides every page; page text is not kept, the extraction phase reads it again."""
    analyses: dict[int, PageAnalysis] = {}
    total_chars = 0
    for index in range(run.page_count):
        if run.checkpoints.is_done(index):
            continue
        run.context.check()
        content = read_page(run, index)
        total_chars = check_document_chars(run, total_chars + len(content.text))
        analyses[index] = PageAnalysis(
            index=index,
            decision=decide_from_text(content.text),
            size=PageSize(width=round(content.width, 1), height=round(content.height, 1)),
        )
    return analyses


def read_page(run: Run, index: int, with_rects: bool = True) -> PageContent:
    settings = run.context.settings
    return run.pdf.page_content(index, settings.max_page_chars, settings.max_page_rects, with_rects)


def check_document_chars(run: Run, total_chars: int) -> int:
    limit = run.context.settings.max_document_chars
    if total_chars > limit:
        raise ServiceError(
            "UNPROCESSABLE_DOCUMENT",
            f"The text layer exceeds {limit} characters",
            details={"maxDocumentChars": limit},
        )
    return total_chars


def extract_text_pages(run: Run, analyses: dict[int, PageAnalysis]) -> list[int]:
    """Writes every page the text layer serves; returns the indices that need OCR."""
    pending_ocr: list[int] = []
    written = 0
    ocr_enabled = run.backend is not None and run.context.request.options.ocr != "never"
    for index in sorted(analyses):
        analysis = analyses[index]
        method = analysis.decision.method
        if method == "ocr":
            if ocr_enabled:
                pending_ocr.append(index)
                continue
            method = "text_fallback"
        content = None if method == "blank" else read_page(run, index, False)
        run.checkpoints.write(
            PageEntry(
                index=index,
                number=index + 1,
                text="" if content is None else strip_nul(content.text),
                method=method,
                truncated=content is not None and content.truncated,
                ocr_reason=analysis.decision.ocr_reason,
                size=analysis.size,
            )
        )
        written += 1
        if written % run.context.settings.checkpoint_pages == 0:
            run.context.report_progress(run.progress())
    run.context.report_progress(run.progress())
    if (
        pending_ocr == []
        and run.backend is None
        and any(analysis.decision.method == "ocr" for analysis in analyses.values())
    ):
        run.warnings.append("ocr_not_configured")
    return pending_ocr


def extract_ocr_pages(run: Run, analyses: dict[int, PageAnalysis], pending: list[int]) -> None:
    if not pending:
        return
    raise ServiceError("INTERNAL", "OCR dispatch is not available in this build")


def finalize(run: Run, downloaded: DownloadedInput) -> None:
    context = run.context
    pages = run.checkpoints.ordered()
    if len(pages) != run.page_count:
        raise ServiceError(
            "INTERNAL",
            f"{len(pages)} of {run.page_count} pages checkpointed",
        )
    if all(page.text.strip() == "" for page in pages):
        raise ServiceError("EMPTY_DOCUMENT", "Every page is blank or empty after extraction")
    if any(page.truncated for page in pages):
        run.warnings.append("page_text_truncated")
    run.timings.total_ms = int((time.perf_counter() - run.started) * 1000)
    result = ExtractionResult(
        job_id=context.job_id,
        idempotency_key=context.request.idempotency_key,
        document=DocumentInfo(
            file_name=context.request.file_name,
            declared_mime_type=context.request.declared_mime_type,
            detected_type=downloaded.detected_type,
            page_count=run.page_count,
            ocr_model=run.backend.model if run.backend else None,
            rule_version=RULE_VERSION,
            pages_ocr=sum(1 for page in pages if page.method == "ocr"),
            pages_text=sum(1 for page in pages if page.method in ("text", "text_fallback")),
            pages_blank=sum(1 for page in pages if page.method == "blank"),
            warnings=sorted(set(run.warnings)),
            timings=run.timings,
        ),
        pages=pages,
    )
    write_result(context, result)


def write_result(context: JobContext, result: ExtractionResult) -> None:
    """Writes the result, then compare-and-sets succeeded; a cancelled job gets no result (§7.1)."""
    bucket = context.request.output.bucket
    prefix = context.request.output.key_prefix
    data = result.model_dump_json(by_alias=True).encode()
    final = ObjectRef(bucket, f"{prefix}result.json")
    temporary = ObjectRef(bucket, f"{prefix}result.json.tmp-{context.attempt}")
    # The guarded progress write is the last point at which an interruption leaves no object
    # behind; after it the only exit is the compare-and-set below.
    context.report_progress(
        JobProgress(
            pages_total=result.document.page_count,
            pages_done=result.document.page_count,
            pages_ocr=result.document.pages_ocr,
            pages_text=result.document.pages_text,
        )
    )
    context.objects.put_bytes(temporary, data)
    context.objects.copy(temporary, final)
    context.objects.delete(temporary)
    ref = ResultRef(
        bucket=bucket,
        key=final.key,
        bytes=len(data),
        sha256=hashlib.sha256(data).hexdigest(),
        page_count=result.document.page_count,
    )
    if not context.store.succeed(
        context.job_id, ref, context.settings.replica_id, context.settings.record_ttl_seconds
    ):
        discard_unclaimed_result(context, final)
        return
    logger.info(
        "result written",
        extra={
            "jobId": context.job_id,
            "pages": result.document.page_count,
            "pagesOcr": result.document.pages_ocr,
            "pagesText": result.document.pages_text,
            "pagesBlank": result.document.pages_blank,
            "totalMs": result.document.timings.total_ms,
        },
    )


def discard_unclaimed_result(context: JobContext, final: ObjectRef) -> None:
    """A cancelled or released job keeps no result; a job another replica now holds keeps its."""
    state = context.store.state(context.job_id)
    if state in (None, "cancelled"):
        context.objects.delete(final)
        logger.info("result discarded, job no longer running", extra={"jobId": context.job_id})
        return
    logger.info(
        "result left to the replica that holds the job",
        extra={"jobId": context.job_id, "state": state},
    )
    raise JobInterruptedError("lease_lost")


def register_pdf_extractor() -> None:
    register_extractor("pdf", extract_pdf)
