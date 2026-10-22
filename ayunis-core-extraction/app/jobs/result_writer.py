"""Writes `<keyPrefix>result.json` and compare-and-sets the job to succeeded (contract §4, §7.1)."""

import hashlib
import logging

from app.api.models import JobProgress, ResultRef
from app.jobs.runtime import JobContext, JobInterruptedError
from app.result import ExtractionResult
from app.storage.objects import ObjectRef

logger = logging.getLogger(__name__)


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
