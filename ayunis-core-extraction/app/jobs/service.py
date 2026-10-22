import logging

import redis

from app.api.models import (
    JobStatus,
    ReleaseResponse,
    ResultRef,
    StartJobRequest,
)
from app.config import Settings
from app.errors import ServiceError, internal, invalid_request, job_not_found, service_unavailable
from app.jobs.store import JobStore, is_terminal
from app.storage.objects import ObjectStore

logger = logging.getLogger(__name__)


class JobService:
    """What the API exposes; the same operations serve the janitor's orphan handling."""

    def __init__(self, store: JobStore, objects: ObjectStore, settings: Settings) -> None:
        self.store = store
        self.objects = objects
        self.settings = settings

    def start(self, request: StartJobRequest) -> tuple[int, JobStatus]:
        max_pages = request.options.max_pages
        if max_pages is not None and max_pages > self.settings.max_pages:
            raise invalid_request(
                f"options.maxPages {max_pages} exceeds the service limit {self.settings.max_pages}"
            )
        try:
            outcome = self.store.start(request)
        except redis.RedisError as error:
            raise service_unavailable(f"Redis unreachable: {error}") from error
        if outcome.status == "conflict":
            raise ServiceError(
                "IDEMPOTENCY_CONFLICT",
                "Idempotency key exists with a different input or output",
                status=409,
                details={"jobId": outcome.job_id},
            )
        status = self.require(outcome.job_id)
        logger.info(
            "job start",
            extra={
                "jobId": status.job_id,
                "outcome": outcome.status,
                "sourceId": request.owner.source_id,
            },
        )
        return (201 if outcome.status == "created" else 200), status

    def require(self, job_id: str) -> JobStatus:
        try:
            status = self.store.status(job_id)
        except redis.RedisError as error:
            raise service_unavailable(f"Redis unreachable: {error}") from error
        if status is None:
            raise job_not_found(job_id)
        return status

    def status(self, job_id: str) -> JobStatus:
        status = self.require(job_id)
        self.store.touch_polled(job_id)
        return status

    def status_by_key(self, idempotency_key: str) -> JobStatus:
        job_id = self.store.find_by_key(idempotency_key)
        if job_id is None:
            raise job_not_found(idempotency_key)
        return self.status(job_id)

    def result(self, job_id: str) -> ResultRef:
        status = self.require(job_id)
        if status.state != "succeeded" or status.result is None:
            raise ServiceError("JOB_NOT_FINISHED", f"Job {job_id} is {status.state}", status=409)
        return status.result

    def cancel(self, job_id: str) -> tuple[int, JobStatus]:
        outcome = self.store.cancel(job_id)
        if outcome == "missing":
            raise job_not_found(job_id)
        status = self.require(job_id)
        if outcome == "done":
            self._purge_output(status.job_id)
            logger.info("job cancelled", extra={"jobId": job_id})
            return 202, status
        return 200, status

    def release(self, job_id: str) -> bool:
        """Cancels if needed, removes what the service wrote, forgets the job.

        Returns whether the job was still active.
        """
        record = self.store.get(job_id)
        if record is None:
            return False
        was_active = not is_terminal(record.status.state)
        if was_active:
            self.store.cancel(job_id)
        self.objects.delete_prefix(record.request.output.bucket, record.request.output.key_prefix)
        self.store.delete(job_id)
        logger.info("job released", extra={"jobId": job_id, "wasActive": was_active})
        return was_active

    def release_owner(self, org_id: str, source_ids: list[str] | None) -> ReleaseResponse:
        wanted = None if source_ids is None else set(source_ids)
        released = cancelled = 0
        for job_id in self.store.jobs_of_owner(org_id):
            record = self.store.get(job_id)
            if record is None:
                continue
            if wanted is not None and record.request.owner.source_id not in wanted:
                continue
            if self.release(job_id):
                cancelled += 1
            released += 1
        return ReleaseResponse(released=released, cancelled=cancelled)

    def _purge_output(self, job_id: str) -> None:
        record = self.store.get(job_id)
        if record is None:
            return
        try:
            self.objects.delete_prefix(
                record.request.output.bucket, record.request.output.key_prefix
            )
        except ServiceError as error:
            logger.warning("output purge failed", extra={"jobId": job_id, "reason": error.message})


def wrap_unexpected(error: Exception) -> ServiceError:
    if isinstance(error, ServiceError):
        return error
    if isinstance(error, redis.RedisError):
        return service_unavailable(f"Redis unreachable: {error}")
    return internal(f"{type(error).__name__}: {error}")
