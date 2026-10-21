"""One job from claim to terminal state (contract §12 step 3)."""

import logging
import time
from collections.abc import Callable
from pathlib import Path

from app.errors import ServiceError
from app.jobs.runtime import JobContext
from app.storage.objects import ObjectRef

logger = logging.getLogger(__name__)

Extractor = Callable[[JobContext, Path, "DownloadedInput"], None]


class DownloadedInput:
    def __init__(self, path: Path, size: int, detected_type: str, download_ms: int) -> None:
        self.path = path
        self.size = size
        self.detected_type = detected_type
        self.download_ms = download_ms


EXTRACTORS: dict[str, Extractor] = {}


def register_extractor(detected_type: str, extractor: Extractor) -> None:
    EXTRACTORS[detected_type] = extractor


def detect_type(path: Path) -> str:
    with path.open("rb") as handle:
        head = handle.read(8)
    if head.startswith(b"%PDF"):
        return "pdf"
    return "unknown"


def download_input(context: JobContext) -> DownloadedInput:
    request = context.request
    started = time.perf_counter()
    source = ObjectRef(request.input.bucket, request.input.key)
    size = context.objects.object_size(source)
    if size > context.settings.max_input_bytes:
        raise ServiceError(
            "INPUT_TOO_LARGE",
            f"Object is {size} bytes, limit {context.settings.max_input_bytes}",
            details={"bytes": size, "maxBytes": context.settings.max_input_bytes},
        )
    target = context.scratch / "input"
    context.objects.download(source, target, request.input.sha256)
    detected = detect_type(target)
    download_ms = int((time.perf_counter() - started) * 1000)
    logger.info(
        "input downloaded",
        extra={
            "jobId": context.job_id,
            "bytes": size,
            "detectedType": detected,
            "downloadMs": download_ms,
        },
    )
    return DownloadedInput(target, size, detected, download_ms)


def run_job(context: JobContext) -> None:
    context.set_phase("downloading")
    downloaded = download_input(context)
    extractor = EXTRACTORS.get(downloaded.detected_type)
    if extractor is None:
        raise ServiceError(
            "UNSUPPORTED_TYPE",
            f"The service does not handle {downloaded.detected_type} input",
            details={"declaredMimeType": context.request.declared_mime_type},
        )
    extractor(context, context.scratch, downloaded)
