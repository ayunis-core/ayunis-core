import json
import logging
import os
import time
from dataclasses import dataclass
from functools import partial

import anyio
import anyio.to_thread
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

from app.models import (
    AnalyzeRequest,
    AnalyzeResponse,
    HealthResponse,
    RecognizerResult,
)
from app.presidio_service import (
    get_presidio_service,
    is_presidio_service_loaded,
)

# How many analyses may run at once. Analysis is synchronous CPU-bound GLiNER
# inference, so it must not run on the event loop — there it blocks every other
# request, including /health, until it finishes (AYC-561).
#
# The bound matters as much as the dispatch: working memory scales with input
# length (~3.3 MB per 1k characters), so unbounded concurrency on long inputs
# can exhaust the container. The production allocation is 4 CPUs; a local
# four-thread benchmark of four 6k inputs completed 21% sooner with 4 workers
# than with 2, while the 6 GB memory limit still covers four maximum-size jobs.
MAX_CONCURRENT_ANALYSES = int(os.getenv("MAX_CONCURRENT_ANALYSES", "4"))

# Each workload gets a dedicated thread budget instead of the global default
# threadpool, and the handlers stay `async def` so they dispatch to it
# explicitly.
#
# Sizing the *global* limiter down to MAX_CONCURRENT_ANALYSES would be the
# obvious alternative and is wrong: FastAPI routes response-model validation
# for a sync handler through that same threadpool, so a finished analysis would
# have to queue behind another inference just to serialise its response, and
# could exceed the caller's timeout after the work was already done. An
# `async def` handler serialises inline on the event loop and never competes.
_analysis_limiter = anyio.CapacityLimiter(MAX_CONCURRENT_ANALYSES)

# Separate again for /health, so a saturated analysis queue can never delay the
# container healthcheck past its timeout and get the service declared unhealthy.
_health_limiter = anyio.CapacityLimiter(1)
_analysis_logger = logging.getLogger("uvicorn.error.anonymize.analysis")


@dataclass(frozen=True)
class AnalysisMetrics:
    queue_duration_ms: float
    model_load_duration_ms: float
    processing_duration_ms: float
    cold_start: bool


@dataclass(frozen=True)
class AnalysisRun:
    results: list[dict]
    metrics: AnalysisMetrics


def _analyze(text: str, entities, enqueued_at: float) -> AnalysisRun:
    """Runs on a worker thread, outside the event loop."""
    worker_started_at = time.perf_counter()
    cold_start = not is_presidio_service_loaded()
    model_load_started_at = time.perf_counter()
    service = get_presidio_service()
    processing_started_at = time.perf_counter()
    outcome = "success"

    try:
        results = service.analyze(text=text, entities=entities)
    except Exception:
        outcome = "error"
        raise
    finally:
        processing_finished_at = time.perf_counter()
        metrics = AnalysisMetrics(
            queue_duration_ms=(worker_started_at - enqueued_at) * 1000,
            model_load_duration_ms=(processing_started_at - model_load_started_at)
            * 1000,
            processing_duration_ms=(processing_finished_at - processing_started_at)
            * 1000,
            cold_start=cold_start,
        )
        _analysis_logger.info(
            json.dumps(
                {
                    "event": "anonymize_analysis",
                    "outcome": outcome,
                    "text_length": len(text),
                    "queue_duration_ms": round(metrics.queue_duration_ms, 2),
                    "model_load_duration_ms": round(metrics.model_load_duration_ms, 2),
                    "processing_duration_ms": round(metrics.processing_duration_ms, 2),
                    "cold_start": cold_start,
                }
            )
        )

    return AnalysisRun(results=results, metrics=metrics)


# Initialize FastAPI app
app = FastAPI(
    title="MS Presidio PII Detection API",
    description="API for detecting PII in English and German text using Microsoft Presidio",
    version="1.0.0",
)

# Add CORS middleware for web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint

    Reports healthy only once the model is loaded, so `depends_on:
    service_healthy` holds the API back until analysis can actually be served.

    Returns service status and supported languages
    """
    await anyio.to_thread.run_sync(get_presidio_service, limiter=_health_limiter)
    return HealthResponse(status="healthy")


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_text(request: AnalyzeRequest, response: Response):
    """
    Analyze text for PII entities

    Detects personally identifiable information in the provided text.
    Supports English (en) and German (de) languages.

    Args:
        request: AnalyzeRequest containing text, language, and optional entity filters

    Returns:
        AnalyzeResponse with list of detected PII entities

    Raises:
        HTTPException: If analysis fails
    """
    try:
        enqueued_at = time.perf_counter()
        analysis_run = await anyio.to_thread.run_sync(
            partial(_analyze, request.text, request.entities, enqueued_at),
            limiter=_analysis_limiter,
        )
        metrics = analysis_run.metrics
        response.headers["Server-Timing"] = (
            f"queue;dur={metrics.queue_duration_ms:.2f}, "
            f"model_load;dur={metrics.model_load_duration_ms:.2f}, "
            f"processing;dur={metrics.processing_duration_ms:.2f}"
        )
        response.headers["X-Anonymize-Cold-Start"] = str(metrics.cold_start).lower()

        # Convert to response model
        recognizer_results = [
            RecognizerResult(**result) for result in analysis_run.results
        ]

        return AnalyzeResponse(results=recognizer_results)

    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e!s}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
