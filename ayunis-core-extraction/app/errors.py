from typing import Any


class ServiceError(Exception):
    """Contract §10.1 failure.

    Raised inside a job it fails the job; raised in a handler it becomes the error body.
    """

    def __init__(
        self,
        code: str,
        message: str,
        *,
        retryable: bool = False,
        status: int = 500,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.retryable = retryable
        self.status = status
        self.details = details

    def to_failure(self) -> dict[str, Any]:
        failure: dict[str, Any] = {
            "code": self.code,
            "message": self.message,
            "retryable": self.retryable,
        }
        if self.details is not None:
            failure["details"] = self.details
        return failure


def invalid_request(message: str) -> ServiceError:
    return ServiceError("INVALID_REQUEST", message, status=400)


def job_not_found(job_id: str) -> ServiceError:
    return ServiceError("JOB_NOT_FOUND", f"Unknown or expired job {job_id}", status=404)


def service_unavailable(message: str) -> ServiceError:
    return ServiceError("SERVICE_UNAVAILABLE", message, retryable=True, status=503)


def storage_unavailable(message: str) -> ServiceError:
    return ServiceError("STORAGE_UNAVAILABLE", message, retryable=True, status=503)


def internal(message: str) -> ServiceError:
    return ServiceError("INTERNAL", message, status=500)
