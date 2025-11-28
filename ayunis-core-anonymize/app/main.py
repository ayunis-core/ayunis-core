from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.models import (
    AnalyzeRequest,
    AnalyzeResponse,
    RecognizerResult,
    HealthResponse
)
from app.presidio_service import get_presidio_service

# Initialize FastAPI app
app = FastAPI(
    title="MS Presidio PII Detection API",
    description="API for detecting PII in English and German text using Microsoft Presidio",
    version="1.0.0"
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

    Returns service status and supported languages
    """
    service = get_presidio_service()
    return HealthResponse(
        status="healthy",
        supported_languages=service.get_supported_languages()
    )


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
        # Get Presidio service
        service = get_presidio_service()

        # Perform analysis
        results = service.analyze(
            text=request.text,
            language=request.language.value,
            entities=request.entities
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
