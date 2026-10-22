"""PDF extraction: count, analyse, extract text-layer pages, OCR the rest, write the result."""

import logging
import time
from dataclasses import dataclass, field
from pathlib import Path

from app.api.models import JobProgress
from app.config import RULE_VERSION, Settings
from app.errors import ServiceError
from app.jobs.abortable import call_abortable
from app.jobs.extractors import DownloadedInput, register_extractor
from app.jobs.result_writer import write_result
from app.jobs.runtime import JobContext
from app.ocr.backend import OcrBackend, resolve_ocr_backend
from app.ocr.batching import iter_batches
from app.pdf.checkpoints import Checkpoints, MemoryCheckpoints
from app.pdf.decision import PageDecision, apply_document_shortcut, decide_page
from app.pdf.document import PageContent, PdfFile
from app.pdf.signals import measure_page
from app.pdf.wordlists import WordCache, WordLists
from app.result import (
    DocumentInfo,
    ExtractionResult,
    PageEntry,
    PageQuality,
    PageSize,
    Timings,
    strip_nul,
)

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class PdfSource:
    """The PDF a job extracts: the input itself, or what the converter made of it."""

    path: Path
    detected_type: str
    download_ms: int = 0
    conversion_ms: int = 0
    converter: str | None = None


@dataclass(frozen=True)
class InlineExtraction:
    """Pages extracted without checkpoints or progress, for a document inside an email."""

    pages: list[PageEntry]
    warnings: list[str]


class _WordListRegistry:
    """One loaded dictionary set per word-list directory, shared by every job."""

    def __init__(self) -> None:
        self._lists: dict[str | None, WordLists] = {}

    def get(self, settings: Settings) -> WordLists:
        key = settings.word_lists_dir
        if key not in self._lists:
            self._lists[key] = WordLists(Path(key) if key else None)
        return self._lists[key]


WORD_LISTS = _WordListRegistry()


@dataclass
class PageAnalysis:
    index: int
    decision: PageDecision
    quality: PageQuality
    size: PageSize


@dataclass
class Run:
    context: JobContext
    pdf: PdfFile
    checkpoints: Checkpoints
    backend: OcrBackend | None
    warnings: list[str] = field(default_factory=list)
    timings: Timings = field(default_factory=Timings)
    word_cache: WordCache = field(default_factory=WordCache)
    started: float = field(default_factory=time.perf_counter)
    # Off for a document inside an email: its pages are not the job's pages.
    publish_progress: bool = True

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

    def report_progress(self) -> None:
        if self.publish_progress:
            self.context.report_progress(self.progress())

    def sync_ocr_metric(self) -> None:
        """The job's OCR page count comes from its checkpoints, reused ones included; a document
        inside an email does not count towards the job's pages."""
        if self.publish_progress:
            self.context.metrics.pages_ocr = self.progress().pages_ocr


def extract_pdf(context: JobContext, downloaded: DownloadedInput) -> None:
    extract_pdf_document(context, PdfSource(downloaded.path, "pdf", downloaded.download_ms))


def extract_pdf_document(context: JobContext, source: PdfSource) -> None:
    """The whole job: checkpoints under the output prefix, progress on the job, result.json."""
    context.set_phase("counting")
    with PdfFile(source.path) as pdf:
        run = Run(context, pdf, Checkpoints(context), resolve_ocr_backend(context.settings))
        run.timings.download_ms = source.download_ms
        run.timings.conversion_ms = source.conversion_ms
        context.metrics.pages_total = run.page_count
        check_page_limit(run)
        run.checkpoints.load_existing(run.page_count)
        run.sync_ocr_metric()
        run.report_progress()

        context.set_phase("analyzing")
        analysis_started = time.perf_counter()
        analyses = analyse_pages(run)
        run.timings.analysis_ms = int((time.perf_counter() - analysis_started) * 1000)
        context.metrics.record_stage("analysis", run.timings.analysis_ms)

        context.set_phase("extracting")
        pending_ocr = extract_text_pages(run, analyses)
        ocr_started = time.perf_counter()
        extract_ocr_pages(run, analyses, pending_ocr)
        run.timings.ocr_ms = int((time.perf_counter() - ocr_started) * 1000)
        context.metrics.record_stage("ocr", run.timings.ocr_ms)

        context.set_phase("finalizing")
        finalize(run, source)


def extract_pdf_inline(context: JobContext, path: Path) -> InlineExtraction:
    """Same analysis, text layer and OCR for a PDF attached to an email, kept in memory.

    Nothing is checkpointed: a restart redoes the email's attachments, bounded like the backend's
    in-process extraction was. The job's own stop checks and page limit still apply.
    """
    with PdfFile(path) as pdf:
        run = Run(
            context,
            pdf,
            MemoryCheckpoints(context),
            resolve_ocr_backend(context.settings),
            publish_progress=False,
        )
        check_page_limit(run)
        analysis_started = time.perf_counter()
        analyses = analyse_pages(run)
        context.metrics.record_stage(
            "analysis", int((time.perf_counter() - analysis_started) * 1000)
        )
        pending_ocr = extract_text_pages(run, analyses)
        ocr_started = time.perf_counter()
        extract_ocr_pages(run, analyses, pending_ocr)
        context.metrics.record_stage("ocr", int((time.perf_counter() - ocr_started) * 1000))
        return InlineExtraction(run.checkpoints.ordered(), sorted(set(run.warnings)))


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
    settings = run.context.settings
    options = run.context.request.options
    total_chars = 0
    for index in range(run.page_count):
        if run.checkpoints.is_done(index):
            continue
        run.context.check()
        content = read_page(run, index)
        total_chars = check_document_chars(run, total_chars + len(content.text))
        raster = run.pdf.render_grayscale(
            index, settings.render_dpi, content.rects, settings.max_render_pixels
        )
        quality = measure_page(
            content,
            raster,
            WORD_LISTS.get(settings),
            options.language_hints,
            settings.word_validity_min_tokens,
            run.word_cache,
        )
        analyses[index] = PageAnalysis(
            index=index,
            decision=decide_page(quality, options.ocr, settings),
            quality=quality,
            size=PageSize(width=round(content.width, 1), height=round(content.height, 1)),
        )
    decisions = {index: analysis.decision for index, analysis in analyses.items()}
    # Pages a previous attempt checkpointed count towards the document's OCR share; a
    # text_fallback page was routed to OCR by the rule too, the backend was just missing.
    done = run.checkpoints.pages.values()
    if apply_document_shortcut(
        decisions,
        settings.document_ocr_share,
        page_count=run.page_count,
        ocr_pages_done=sum(1 for page in done if page.method in ("ocr", "text_fallback")),
    ):
        run.warnings.append("ocr_document_shortcut")
        for index, decision in decisions.items():
            analyses[index].decision = decision
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
                quality=analysis.quality,
                size=analysis.size,
            )
        )
        written += 1
        if written % run.context.settings.checkpoint_pages == 0:
            run.report_progress()
    run.report_progress()
    if (
        pending_ocr == []
        and run.backend is None
        and any(analysis.decision.method == "ocr" for analysis in analyses.values())
    ):
        run.warnings.append("ocr_not_configured")
    return pending_ocr


def extract_ocr_pages(run: Run, analyses: dict[int, PageAnalysis], pending: list[int]) -> None:
    """One provider call per batch; every page of a batch is checkpointed before the next call."""
    if not pending:
        return
    backend = run.backend
    assert backend is not None
    settings = run.context.settings
    scratch = run.context.scratch / "ocr"
    scratch.mkdir(exist_ok=True)
    for indices, path in iter_batches(
        run.pdf, pending, settings.ocr_batch_pages, settings.ocr_batch_bytes, scratch
    ):
        run.context.check()
        started = time.perf_counter()
        pdf_bytes = path.read_bytes()
        # Counted before the call: a provider call that fails still spent the pages.
        run.context.metrics.ocr_pages_sent += len(indices)
        texts = call_abortable(
            run.context, backend.call(pdf_bytes, len(indices), run.context.check)
        )
        path.unlink(missing_ok=True)
        if len(texts) != len(indices):
            run.warnings.append("ocr_page_count_mismatch")
            texts = (texts + [""] * len(indices))[: len(indices)]
        for index, text in zip(indices, texts, strict=True):
            analysis = analyses[index]
            run.checkpoints.write(
                PageEntry(
                    index=index,
                    number=index + 1,
                    text=strip_nul(text),
                    method="ocr",
                    ocr_reason=analysis.decision.ocr_reason,
                    quality=analysis.quality,
                    size=analysis.size,
                )
            )
        run.report_progress()
        run.sync_ocr_metric()
        logger.info(
            "ocr batch done",
            extra={
                "jobId": run.context.job_id,
                "pages": len(indices),
                "firstPage": indices[0],
                "batchMs": int((time.perf_counter() - started) * 1000),
            },
        )


def finalize(run: Run, source: PdfSource) -> None:
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
            detected_type=source.detected_type,
            page_count=run.page_count,
            converter=source.converter,
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


def register_pdf_extractor() -> None:
    register_extractor("pdf", extract_pdf)
