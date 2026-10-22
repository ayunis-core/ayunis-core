"""The result object written to `<keyPrefix>result.json` (contract §4)."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

RESULT_SCHEMA_VERSION: Literal[1] = 1

PageMethod = Literal["text", "ocr", "text_fallback", "blank"]
OcrReason = Literal["no_text", "low_coverage", "garbage", "invalid_words", "table", "forced"]


class ResultModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


class PageQuality(ResultModel):
    char_count: int
    ink_ratio: float
    text_ink_coverage: float
    garbage_ratio: float
    word_validity: float | None
    table_likelihood: float


class PageSize(ResultModel):
    width: float
    height: float


class PageEntry(ResultModel):
    index: int = Field(ge=0)
    number: int = Field(ge=1)
    text: str
    method: PageMethod
    ocr_reason: OcrReason | None = None
    quality: PageQuality | None = None
    size: PageSize | None = None
    # Kept per page so a restart that reuses the checkpoint still reports the cut.
    truncated: bool = False


class Timings(ResultModel):
    download_ms: int = 0
    conversion_ms: int = 0
    analysis_ms: int = 0
    ocr_ms: int = 0
    total_ms: int = 0


class DocumentInfo(ResultModel):
    file_name: str
    declared_mime_type: str
    detected_type: str
    page_count: int
    converter: str | None = None
    ocr_model: str | None = None
    rule_version: str
    pages_ocr: int = 0
    pages_text: int = 0
    pages_blank: int = 0
    warnings: list[str] = Field(default_factory=list)
    timings: Timings = Field(default_factory=Timings)


class ExtractionResult(ResultModel):
    schema_version: Literal[1] = RESULT_SCHEMA_VERSION
    job_id: str
    idempotency_key: str
    document: DocumentInfo
    pages: list[PageEntry]


def strip_nul(text: str) -> str:
    """PostgreSQL rejects NUL; everything else stays verbatim."""
    return text.replace("\x00", "")
