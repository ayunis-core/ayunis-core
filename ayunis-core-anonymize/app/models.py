from typing import List, Optional
from pydantic import BaseModel, Field
from enum import Enum


class Language(str, Enum):
    """Supported languages"""
    ENGLISH = "en"
    GERMAN = "de"


class AnalyzeRequest(BaseModel):
    """Request model for PII analysis"""
    text: str = Field(..., description="Text to analyze for PII")
    language: Language = Field(..., description="Language of the text (en or de)")
    entities: Optional[List[str]] = Field(
        None,
        description="Optional list of specific entity types to detect (e.g., ['PERSON', 'EMAIL'])"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "text": "My name is John Doe and my email is john.doe@example.com",
                    "language": "en",
                    "entities": ["PERSON", "EMAIL"]
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
    supported_languages: List[str]
