from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

JobState = Literal["queued", "running", "succeeded", "failed", "cancelled"]
JobPhase = Literal["downloading", "converting", "counting", "analyzing", "extracting", "finalizing"]
OcrMode = Literal["auto", "always", "never"]
TERMINAL_STATES: frozenset[str] = frozenset({"succeeded", "failed", "cancelled"})

IDEMPOTENCY_KEY_PATTERN = r"^[A-Za-z0-9:_-]{1,160}$"


class ContractModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


class JobOwner(ContractModel):
    org_id: str = Field(min_length=1, max_length=64)
    source_id: str = Field(min_length=1, max_length=64)


class ObjectInput(ContractModel):
    bucket: str = Field(min_length=1)
    key: str = Field(min_length=1, max_length=1024)
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")


class JobOutput(ContractModel):
    bucket: str = Field(min_length=1)
    key_prefix: str = Field(min_length=1, max_length=1024)


class JobOptions(ContractModel):
    max_pages: int | None = Field(default=None, ge=1)
    ocr: OcrMode = "auto"
    language_hints: list[str] = Field(default_factory=lambda: ["de", "en"], max_length=8)


class StartJobRequest(ContractModel):
    idempotency_key: str = Field(pattern=IDEMPOTENCY_KEY_PATTERN)
    owner: JobOwner
    input: ObjectInput
    file_name: str = Field(min_length=1, max_length=512)
    declared_mime_type: str = Field(min_length=1, max_length=255)
    output: JobOutput
    options: JobOptions = Field(default_factory=JobOptions)


class JobProgress(ContractModel):
    """Every counter is always present: the backend reads them without defaults."""

    pages_total: int | None
    pages_done: int
    pages_ocr: int
    pages_text: int


EMPTY_PROGRESS = JobProgress(pages_total=None, pages_done=0, pages_ocr=0, pages_text=0)


class ResultRef(ContractModel):
    bucket: str
    key: str
    bytes: int
    sha256: str
    page_count: int


class JobFailure(ContractModel):
    code: str
    message: str
    retryable: bool
    details: dict[str, Any] | None = None


class JobStatus(ContractModel):
    job_id: str
    idempotency_key: str
    state: JobState
    phase: JobPhase | None
    attempt: int
    restarts: int
    progress: JobProgress
    result: ResultRef | None
    error: JobFailure | None
    created_at: str
    started_at: str | None
    updated_at: str
    finished_at: str | None


class ReleaseRequest(ContractModel):
    org_id: str = Field(min_length=1, max_length=64)
    source_ids: list[str] | None = Field(default=None, max_length=1000)


class ReleaseResponse(ContractModel):
    released: int
    cancelled: int


class ErrorResponse(ContractModel):
    error: JobFailure


class HealthResponse(ContractModel):
    status: str
    contract_version: int
