"""Worker pool, lease keeper and janitor threads (contract §6, §7.3)."""

import logging
import shutil
import threading
import time
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path

import redis

from app.api.models import EMPTY_PROGRESS, JobFailure, JobProgress, StartJobRequest
from app.config import Settings
from app.errors import ServiceError
from app.jobs.service import JobService
from app.jobs.store import JobRecord, JobStore
from app.metrics import REGISTRY, JobMetrics, JobOutcome, classify_outcome
from app.storage.objects import ObjectStore

logger = logging.getLogger(__name__)


class JobInterruptedError(Exception):
    """The job must stop without writing state: cancelled, released, lease lost or shutting down."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


class JobContext:
    """What a pipeline gets from the runtime: request, scratch space, progress, stop checks."""

    def __init__(
        self,
        record: JobRecord,
        store: JobStore,
        objects: ObjectStore,
        settings: Settings,
        scratch: Path,
        stopping: threading.Event,
    ) -> None:
        self.job_id = record.job_id
        self.request: StartJobRequest = record.request
        self.attempt = record.status.attempt
        self.store = store
        self.objects = objects
        self.settings = settings
        self.scratch = scratch
        self.stopping = stopping
        self.lease_lost = threading.Event()
        self.started_at = time.monotonic()
        self.last_renewed_at = time.monotonic()
        self.progress = EMPTY_PROGRESS
        self.metrics = JobMetrics()

    def check(self) -> None:
        """Called between pages, between OCR batches and before every write (contract §7.1)."""
        if self.lease_lost.is_set():
            raise JobInterruptedError("lease_lost")
        if self.stopping.is_set():
            raise JobInterruptedError("shutdown")
        if time.monotonic() - self.started_at > self.settings.max_job_seconds:
            raise ServiceError(
                "JOB_TIMEOUT", f"Job exceeded {self.settings.max_job_seconds:.0f}s", retryable=True
            )
        state = self.store.state(self.job_id)
        if state != "running":
            raise JobInterruptedError("released" if state is None else state)

    def set_phase(self, phase: str) -> None:
        self.check()
        self._guarded(self.store.set_phase(self.job_id, phase, self.settings.replica_id))

    def report_progress(self, progress: JobProgress) -> None:
        self.progress = progress
        self._guarded(self.store.set_progress(self.job_id, progress, self.settings.replica_id))

    def _guarded(self, outcome: str) -> None:
        if outcome == "lease_lost":
            self.lease_lost.set()
            raise JobInterruptedError("lease_lost")
        if outcome != "ok":
            raise JobInterruptedError("released" if outcome == "missing" else outcome)


Pipeline = Callable[[JobContext], None]


class WorkerPool:
    def __init__(
        self,
        store: JobStore,
        objects: ObjectStore,
        settings: Settings,
        pipeline: Pipeline,
    ) -> None:
        self.store = store
        self.objects = objects
        self.settings = settings
        self.pipeline = pipeline
        self.stopping = threading.Event()
        self.active: dict[str, JobContext] = {}
        self.active_lock = threading.Lock()
        self.threads: list[threading.Thread] = []

    def start(self) -> None:
        scratch_root = Path(self.settings.scratch_dir)
        shutil.rmtree(scratch_root, ignore_errors=True)
        scratch_root.mkdir(parents=True, exist_ok=True)
        for index in range(self.settings.max_concurrent_jobs):
            thread = threading.Thread(target=self._worker_loop, name=f"worker-{index}", daemon=True)
            thread.start()
            self.threads.append(thread)
        keeper = threading.Thread(target=self._lease_loop, name="lease-keeper", daemon=True)
        keeper.start()
        self.threads.append(keeper)

    def stop(self, timeout: float = 30.0) -> None:
        self.stopping.set()
        deadline = time.monotonic() + timeout
        for thread in self.threads:
            thread.join(max(0.0, deadline - time.monotonic()))

    def _worker_loop(self) -> None:
        while not self.stopping.is_set():
            try:
                job_id = self.store.pop_queued(timeout_seconds=1)
            except redis.RedisError as error:
                logger.warning("queue poll failed", extra={"reason": str(error)})
                time.sleep(1)
                continue
            if job_id is None:
                continue
            if self.stopping.is_set():
                self.store.push_back(job_id)
                return
            self._run(job_id)

    def _run(self, job_id: str) -> None:
        replica = self.settings.replica_id
        try:
            claim = self.store.claim(job_id, replica)
        except redis.RedisError as error:
            logger.warning("claim failed", extra={"jobId": job_id, "reason": str(error)})
            return
        if claim != "claimed":
            logger.info("job not claimable", extra={"jobId": job_id, "state": claim})
            return
        record = self.store.get(job_id)
        if record is None:
            return
        scratch = Path(self.settings.scratch_dir) / job_id
        scratch.mkdir(parents=True, exist_ok=True)
        context = JobContext(
            record, self.store, self.objects, self.settings, scratch, self.stopping
        )
        with self.active_lock:
            self.active[job_id] = context
        REGISTRY.job_started()
        started = time.monotonic()
        lost_store = False
        try:
            try:
                self.pipeline(context)
                logger.info(
                    "job finished",
                    extra={"jobId": job_id, "seconds": round(time.monotonic() - started, 2)},
                )
            except JobInterruptedError as interrupted:
                self._handle_interrupt(job_id, interrupted.reason)
            except ServiceError as error:
                self._fail(context, error)
            except redis.RedisError:
                raise
            except Exception as error:
                logger.exception("job crashed", extra={"jobId": job_id})
                self._fail(context, ServiceError("INTERNAL", f"{type(error).__name__}: {error}"))
        except redis.RedisError as error:
            lost_store = True
            logger.error("job lost its store", extra={"jobId": job_id, "reason": str(error)})
        finally:
            with self.active_lock:
                self.active.pop(job_id, None)
            REGISTRY.job_ended()
            context.metrics.record_stage("total", int((time.monotonic() - started) * 1000))
            # The store's view after every handler ran is the attempt's outcome; recorded before
            # the cleanup below so a store error there cannot drop the event.
            REGISTRY.record(job_id, context.metrics, self._final_outcome(job_id, lost_store))
            try:
                self.store.release_lease(job_id, replica)
            except redis.RedisError as error:
                logger.warning(
                    "lease release failed", extra={"jobId": job_id, "reason": str(error)}
                )
            shutil.rmtree(scratch, ignore_errors=True)

    def _final_outcome(self, job_id: str, lost_store: bool) -> JobOutcome:
        if lost_store:
            return classify_outcome(None, lost_store=True)
        try:
            return classify_outcome(self.store.status(job_id))
        except redis.RedisError as error:
            logger.error("job outcome unknown", extra={"jobId": job_id, "reason": str(error)})
            return classify_outcome(None, lost_store=True)

    def _handle_interrupt(self, job_id: str, reason: str) -> None:
        if reason == "shutdown":
            outcome = self.store.yield_job(job_id, self.settings.replica_id)
            logger.info("job yielded for shutdown", extra={"jobId": job_id, "outcome": outcome})
        else:
            logger.info("job interrupted", extra={"jobId": job_id, "reason": reason})

    def _fail(self, context: JobContext, error: ServiceError) -> None:
        failure = JobFailure(
            code=error.code, message=error.message, retryable=error.retryable, details=error.details
        )
        if self.store.fail(
            context.job_id, failure, self.settings.replica_id, self.settings.record_ttl_seconds
        ):
            logger.warning(
                "job failed",
                extra={"jobId": context.job_id, "code": error.code, "retryable": error.retryable},
            )

    def _lease_loop(self) -> None:
        while not self.stopping.wait(self.settings.lease_renew_seconds):
            with self.active_lock:
                contexts = list(self.active.values())
            for context in contexts:
                self._renew(context)

    def _renew(self, context: JobContext) -> None:
        try:
            renewed = self.store.renew_lease(context.job_id, self.settings.replica_id)
        except redis.RedisError as error:
            logger.warning(
                "lease renewal failed", extra={"jobId": context.job_id, "reason": str(error)}
            )
            # Without a renewal the lease expires on its own; after that another replica may
            # hold the job, so this worker must stop as if it had seen the loss.
            if time.monotonic() - context.last_renewed_at >= self.settings.lease_ttl_seconds:
                context.lease_lost.set()
            return
        if renewed:
            context.last_renewed_at = time.monotonic()
        else:
            context.lease_lost.set()


class Janitor:
    """Reclaims expired leases, re-queues stranded jobs, releases orphans and old records."""

    def __init__(self, store: JobStore, service: JobService, settings: Settings) -> None:
        self.store = store
        self.service = service
        self.settings = settings
        self.stopping = threading.Event()
        self.thread = threading.Thread(target=self._loop, name="janitor", daemon=True)

    def start(self) -> None:
        self.thread.start()

    def stop(self) -> None:
        self.stopping.set()
        self.thread.join(5)

    def _loop(self) -> None:
        while not self.stopping.wait(self.settings.janitor_interval_seconds):
            try:
                self.sweep()
            except redis.RedisError as error:
                logger.warning("janitor sweep failed", extra={"reason": str(error)})
            except Exception:
                logger.exception("janitor sweep crashed")

    def sweep(self) -> None:
        now = datetime.now(UTC)
        for job_id in self.store.all_job_ids():
            record = self.store.get(job_id)
            if record is None:
                self.store.delete(job_id)
                continue
            self._sweep_one(record, now)

    def _sweep_one(self, record: JobRecord, now: datetime) -> None:
        state = record.status.state
        job_id = record.job_id
        if state in ("queued", "running"):
            silent_for = _seconds_between(record.last_polled_at, now)
            if silent_for > self.settings.orphan_after_seconds:
                logger.warning(
                    "releasing orphaned job",
                    extra={"jobId": job_id, "silentSeconds": int(silent_for)},
                )
                self.service.release(job_id)
                return
        if state == "running":
            outcome = self.store.requeue_expired(job_id, self.settings.max_restarts)
            if outcome != "skip":
                logger.warning("expired lease handled", extra={"jobId": job_id, "outcome": outcome})
            return
        if state == "queued":
            stranded_for = _seconds_between(record.status.updated_at, now)
            if stranded_for > self.settings.lease_ttl_seconds and not self.store.is_queued_in_list(
                job_id
            ):
                logger.warning("re-queueing stranded job", extra={"jobId": job_id})
                self.store.push_back(job_id)
            return
        finished_at = record.status.finished_at or record.status.updated_at
        if _seconds_between(finished_at, now) > self.settings.record_ttl_seconds:
            logger.info("expiring terminal job", extra={"jobId": job_id, "state": state})
            self.service.release(job_id)


def _seconds_between(iso_timestamp: str, now: datetime) -> float:
    then = datetime.fromisoformat(iso_timestamp.replace("Z", "+00:00"))
    return (now - then).total_seconds()
