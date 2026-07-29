from typing import List, Optional
from pydantic import BaseModel, Field


# Analysis cost is linear in input length: presidio splits the text into
# 250-character chunks and runs one model pass per chunk, measured at roughly
# 0.4 ms per character (30k chars ≈ 11s, 50k ≈ 20s, 100k ≈ 43s).
#
# The cap is set where the work can still finish inside the caller's 30s
# timeout on a slower host, not at the point where it starts failing. Admitting
# input that is certain to time out is worse than rejecting it: the analysis
# continues after the caller gives up, so a single oversized request holds one
# of the two analysis slots for its full duration and makes everyone else queue
# behind work whose result nobody will read (AYC-561).
#
# 30k characters is ~7,500 words — far beyond any realistic message.
MAX_TEXT_LENGTH = 30_000


class AnalyzeRequest(BaseModel):
    """Request model for PII analysis"""
    text: str = Field(
        ...,
        max_length=MAX_TEXT_LENGTH,
        description="Text to analyze for PII",
    )
    entities: Optional[List[str]] = Field(
        None,
        description="Optional list of specific entity types to detect (e.g., ['PERSON', 'EMAIL'])"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "text": "Mein Name ist Hans Mueller und meine E-Mail ist hans@mueller.de",
                    "entities": ["PERSON", "EMAIL_ADDRESS"]
                }
            ]
        }
    }


class RecognizerResult(BaseModel):
    """Individual PII detection result"""
    entity_type: str = Field(..., description="Type of PII entity detected")
    start: int = Field(..., description="Start position in text")
    end: int = Field(..., description="End position in text")
    score: float = Field(..., description="Confidence score (0.0 to 1.0)")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "entity_type": "PERSON",
                    "start": 11,
                    "end": 19,
                    "score": 0.85
                }
            ]
        }
    }


class AnalyzeResponse(BaseModel):
    """Response model for PII analysis"""
    results: List[RecognizerResult] = Field(..., description="List of detected PII entities")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "results": [
                        {
                            "entity_type": "PERSON",
                            "start": 11,
                            "end": 19,
                            "score": 0.85
                        },
                        {
                            "entity_type": "EMAIL_ADDRESS",
                            "start": 37,
                            "end": 60,
                            "score": 1.0
                        }
                    ]
                }
            ]
        }
    }


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
