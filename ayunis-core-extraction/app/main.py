import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import redis
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.models import ErrorResponse, HealthResponse, JobFailure
from app.api.routes import router
from app.config import CONTRACT_VERSION, Settings, get_settings
from app.email.extractor import register_email_extractors
from app.errors import ServiceError, invalid_request, service_unavailable
from app.jobs.pipeline import run_job
from app.jobs.runtime import Janitor, WorkerPool
from app.jobs.service import JobService
from app.jobs.store import JobStore
from app.logging import configure_logging
from app.office.extractor import register_office_extractor
from app.pdf.extractor import register_pdf_extractor
from app.storage.objects import ObjectStore

logger = logging.getLogger(__name__)

Services = tuple[JobStore, ObjectStore, JobService]


def build_services(settings: Settings) -> Services:
    client = redis.Redis.from_url(settings.redis_url, socket_timeout=10, socket_connect_timeout=5)
    store = JobStore(client, settings.lease_ttl_seconds)
    objects = ObjectStore.from_settings(
        settings.minio_endpoint,
        settings.minio_access_key,
        settings.minio_secret_key,
        settings.minio_use_ssl,
    )
    return store, objects, JobService(store, objects, settings)


def create_app(
    settings: Settings | None = None,
    *,
    run_workers: bool = True,
    services: Services | None = None,
) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level)
    register_pdf_extractor()
    register_office_extractor()
    register_email_extractors()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        store, objects, service = services or build_services(settings)
        app.state.settings = settings
        app.state.store = store
        app.state.objects = objects
        app.state.jobs = service
        pool = WorkerPool(store, objects, settings, run_job) if run_workers else None
        janitor = Janitor(store, service, settings) if run_workers else None
        if pool and janitor:
            pool.start()
            janitor.start()
            logger.info(
                "extraction service started",
                extra={"replica": settings.replica_id, "workers": settings.max_concurrent_jobs},
            )
        try:
            yield
        finally:
            # Running jobs are handed back to the queue between checkpoints (contract §6), so a
            # replacement replica resumes them without spending a restart.
            if janitor:
                janitor.stop()
            if pool:
                pool.stop()
            logger.info("extraction service stopped")

    app = FastAPI(
        title="Ayunis Core document extraction",
        version="1.0.0",
        description="Contract: docs/design/document-extraction-contract.md",
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.include_router(router)

    @app.get(
        "/health",
        response_model=HealthResponse,
        response_model_by_alias=True,
        operation_id="health",
    )
    def health() -> HealthResponse:
        return HealthResponse(status="healthy", contract_version=CONTRACT_VERSION)

    @app.get(
        "/ready",
        response_model=HealthResponse,
        response_model_by_alias=True,
        responses={503: {"model": ErrorResponse}},
        operation_id="ready",
    )
    def ready(request: Request) -> HealthResponse:
        try:
            request.app.state.store.ping()
        except redis.RedisError as error:
            raise service_unavailable(f"Redis unreachable: {error}") from error
        request.app.state.objects.ready()
        return HealthResponse(status="ready", contract_version=CONTRACT_VERSION)

    @app.exception_handler(ServiceError)
    async def service_error_handler(_: Request, error: ServiceError) -> JSONResponse:
        return _error_response(error)

    @app.exception_handler(RequestValidationError)
    async def validation_handler(_: Request, error: RequestValidationError) -> JSONResponse:
        return _error_response(invalid_request(_describe_validation(error)))

    @app.exception_handler(redis.RedisError)
    async def redis_error_handler(_: Request, error: redis.RedisError) -> JSONResponse:
        return _error_response(service_unavailable(f"Redis unreachable: {error}"))

    return app


def _error_response(error: ServiceError) -> JSONResponse:
    body = ErrorResponse(
        error=JobFailure(
            code=error.code, message=error.message, retryable=error.retryable, details=error.details
        )
    )
    return JSONResponse(status_code=error.status, content=body.model_dump(by_alias=True))


def _describe_validation(error: RequestValidationError) -> str:
    parts: list[str] = []
    for item in error.errors()[:5]:
        location = ".".join(str(part) for part in item.get("loc", ()) if part != "body")
        parts.append(f"{location}: {item.get('msg', 'invalid')}")
    return "; ".join(parts) or "Invalid request"


app = create_app()
