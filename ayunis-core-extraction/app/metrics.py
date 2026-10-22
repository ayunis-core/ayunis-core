"""Job metrics, exposed the way ayunis-core-anonymize exposes its analysis metrics: one structured
log event per finished job (`event: extraction_job`) that the log pipeline aggregates, plus a
process-wide snapshot on `GET /metrics` for the deployment's health dashboards."""

import logging
import resource
import sys
import threading
from collections import Counter
from dataclasses import dataclass, field
from typing import Any

from app.api.models import ContractModel, JobStatus

logger = logging.getLogger("app.metrics")

STAGES = ("download", "conversion", "analysis", "ocr", "total")
OUTCOMES = ("succeeded", "failed_retryable", "failed_final", "cancelled", "released", "yielded")
LOST_STORE_CODE = "STORE_LOST"


@dataclass(frozen=True)
class JobOutcome:
    """The metric label of one attempt and the failure code it carries, if any."""

    label: str
    code: str | None = None


def classify_outcome(status: JobStatus | None, lost_store: bool = False) -> JobOutcome:
    """Maps what the store says about the job after the attempt to its metric labels.

    The store-confirmed state is the only input, so a failure that was not persisted, a yield
    that found the job cancelled, or a result discarded after a release all count as what
    actually happened. `lost_store` is the attempt that could not read or write the store.
    """
    if lost_store:
        return JobOutcome("released", LOST_STORE_CODE)
    if status is None:
        return JobOutcome("released")
    if status.state == "succeeded":
        return JobOutcome("succeeded")
    if status.state == "cancelled":
        return JobOutcome("cancelled")
    if status.state == "failed":
        error = status.error
        if error is None:
            return JobOutcome("failed_final")
        return JobOutcome("failed_retryable" if error.retryable else "failed_final", error.code)
    if status.state == "queued":
        # Handed back to the queue: a shutdown yield or an expired lease the janitor requeued.
        return JobOutcome("yielded")
    # Still running: another replica holds the lease now.
    return JobOutcome("released")


@dataclass
class JobMetrics:
    """What one job reports when it ends; extractors fill it in as they go."""

    detected_type: str | None = None
    stages_ms: dict[str, int] = field(default_factory=dict)
    pages_total: int = 0
    pages_ocr: int = 0
    ocr_pages_sent: int = 0

    def record_stage(self, stage: str, milliseconds: int) -> None:
        self.stages_ms[stage] = self.stages_ms.get(stage, 0) + milliseconds


class StageSnapshot(ContractModel):
    count: int
    total_ms: int


class MemorySnapshot(ContractModel):
    rss_bytes: int | None
    max_rss_bytes: int


class MetricsSnapshot(ContractModel):
    jobs: dict[str, int]
    failures_by_code: dict[str, int]
    stages: dict[str, StageSnapshot]
    ocr_pages_sent: int
    active_jobs: int
    memory: MemorySnapshot


class MetricsRegistry:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._jobs: Counter[str] = Counter()
        self._failures: Counter[str] = Counter()
        self._stage_count: Counter[str] = Counter()
        self._stage_ms: Counter[str] = Counter()
        self._ocr_pages_sent = 0
        self.active_jobs = 0

    def record(self, job_id: str, metrics: JobMetrics, outcome: JobOutcome) -> None:
        memory = process_memory()
        with self._lock:
            self._jobs[outcome.label] += 1
            if outcome.code:
                self._failures[outcome.code] += 1
            for stage, milliseconds in metrics.stages_ms.items():
                self._stage_count[stage] += 1
                self._stage_ms[stage] += milliseconds
            self._ocr_pages_sent += metrics.ocr_pages_sent
        logger.info(
            "extraction_job",
            extra={
                "event": "extraction_job",
                "jobId": job_id,
                "outcome": outcome.label,
                "code": outcome.code,
                "detectedType": metrics.detected_type,
                "pagesTotal": metrics.pages_total,
                "pagesOcr": metrics.pages_ocr,
                "ocrPagesSent": metrics.ocr_pages_sent,
                **{f"{stage}Ms": milliseconds for stage, milliseconds in metrics.stages_ms.items()},
                "rssBytes": memory.rss_bytes,
                "maxRssBytes": memory.max_rss_bytes,
            },
        )

    def job_started(self) -> None:
        with self._lock:
            self.active_jobs += 1

    def job_ended(self) -> None:
        with self._lock:
            self.active_jobs = max(0, self.active_jobs - 1)

    def snapshot(self) -> MetricsSnapshot:
        with self._lock:
            return MetricsSnapshot(
                jobs={outcome: self._jobs.get(outcome, 0) for outcome in OUTCOMES},
                failures_by_code=dict(self._failures),
                stages={
                    stage: StageSnapshot(
                        count=self._stage_count.get(stage, 0), total_ms=self._stage_ms.get(stage, 0)
                    )
                    for stage in STAGES
                },
                ocr_pages_sent=self._ocr_pages_sent,
                active_jobs=self.active_jobs,
                memory=process_memory(),
            )


def process_memory() -> MemorySnapshot:
    """Current RSS where the kernel reports it (Linux), peak RSS everywhere."""
    usage = resource.getrusage(resource.RUSAGE_SELF)
    # ru_maxrss is bytes on macOS and kilobytes on Linux.
    max_rss = usage.ru_maxrss if sys.platform == "darwin" else usage.ru_maxrss * 1024
    return MemorySnapshot(rss_bytes=_current_rss(), max_rss_bytes=max_rss)


def _current_rss() -> int | None:
    try:
        with open("/proc/self/statm", encoding="ascii") as handle:
            fields: list[Any] = handle.read().split()
        return int(fields[1]) * resource.getpagesize()
    except (OSError, IndexError, ValueError):
        return None


REGISTRY = MetricsRegistry()
