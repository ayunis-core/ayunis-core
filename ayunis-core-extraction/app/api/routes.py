from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request, Response, status

from app.api.auth import require_token
from app.api.models import (
    ErrorResponse,
    JobStatus,
    ReleaseRequest,
    ReleaseResponse,
    ResultRef,
    StartJobRequest,
)
from app.jobs.service import JobService

router = APIRouter(prefix="/v1", dependencies=[Depends(require_token)])

ERROR_RESPONSES: dict[int | str, dict[str, Any]] = {
    400: {"model": ErrorResponse},
    401: {"model": ErrorResponse},
    404: {"model": ErrorResponse},
    409: {"model": ErrorResponse},
    503: {"model": ErrorResponse},
}


def get_service(request: Request) -> JobService:
    service: JobService = request.app.state.jobs
    return service


Service = Annotated[JobService, Depends(get_service)]


@router.post(
    "/jobs",
    response_model=JobStatus,
    response_model_by_alias=True,
    status_code=status.HTTP_201_CREATED,
    responses={**ERROR_RESPONSES, 200: {"model": JobStatus}},
    operation_id="startJob",
)
def start_job(body: StartJobRequest, service: Service, response: Response) -> JobStatus:
    code, job = service.start(body)
    response.status_code = code
    return job


@router.post(
    "/jobs/release",
    response_model=ReleaseResponse,
    response_model_by_alias=True,
    responses=ERROR_RESPONSES,
    operation_id="releaseJobsByOwner",
)
def release_by_owner(body: ReleaseRequest, service: Service) -> ReleaseResponse:
    return service.release_owner(body.org_id, body.source_ids)


@router.get(
    "/jobs/by-key/{idempotency_key}",
    response_model=JobStatus,
    response_model_by_alias=True,
    responses=ERROR_RESPONSES,
    operation_id="getJobByKey",
)
def get_job_by_key(idempotency_key: str, service: Service) -> JobStatus:
    return service.status_by_key(idempotency_key)


@router.get(
    "/jobs/{job_id}",
    response_model=JobStatus,
    response_model_by_alias=True,
    responses=ERROR_RESPONSES,
    operation_id="getJob",
)
def get_job(job_id: str, service: Service) -> JobStatus:
    return service.status(job_id)


@router.get(
    "/jobs/{job_id}/result",
    response_model=ResultRef,
    response_model_by_alias=True,
    responses=ERROR_RESPONSES,
    operation_id="getJobResult",
)
def get_job_result(job_id: str, service: Service) -> ResultRef:
    return service.result(job_id)


@router.post(
    "/jobs/{job_id}/cancel",
    response_model=JobStatus,
    response_model_by_alias=True,
    status_code=status.HTTP_202_ACCEPTED,
    responses={**ERROR_RESPONSES, 200: {"model": JobStatus}},
    operation_id="cancelJob",
)
def cancel_job(job_id: str, service: Service, response: Response) -> JobStatus:
    code, job = service.cancel(job_id)
    response.status_code = code
    return job


@router.delete(
    "/jobs/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=ERROR_RESPONSES,
    operation_id="releaseJob",
)
def release_job(job_id: str, service: Service) -> Response:
    service.release(job_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
