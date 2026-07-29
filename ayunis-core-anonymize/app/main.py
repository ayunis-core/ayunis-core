import os
from functools import partial

import anyio
import anyio.to_thread
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.models import (
    AnalyzeRequest,
    AnalyzeResponse,
    RecognizerResult,
    HealthResponse,
)
from app.presidio_service import get_presidio_service

# How many analyses may run at once. Analysis is synchronous CPU-bound GLiNER
# inference, so it must not run on the event loop — there it blocks every other
# request, including /health, until it finishes (AYC-561).
#
# The bound matters as much as the dispatch: working memory scales with input
# length (~3.3 MB per 1k characters), so unbounded concurrency on long inputs
# can exhaust the container. Throughput does not reward a larger pool either —
# measured on 4 cores, 2 concurrent analyses cost 1.4x the wall time of 1,
# while 8 cost 7.4x.
MAX_CONCURRENT_ANALYSES = int(os.getenv("MAX_CONCURRENT_ANALYSES", "2"))

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


def _analyze(text: str, entities):
    """Runs on a worker thread — including the first-call model load, which
    must never happen on the event loop."""
    return get_presidio_service().analyze(text=text, entities=entities)


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
async def analyze_text(request: AnalyzeRequest):
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
        results = await anyio.to_thread.run_sync(
            partial(_analyze, request.text, request.entities),
            limiter=_analysis_limiter,
        )

        # Convert to response model
        recognizer_results = [
            RecognizerResult(**result)
            for result in results
        ]

        return AnalyzeResponse(results=recognizer_results)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
