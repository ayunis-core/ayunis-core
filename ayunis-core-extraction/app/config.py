import os
import socket
from functools import lru_cache
from typing import Any, Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

CONTRACT_VERSION = 1
RULE_VERSION = "ocr-rule/1"


class Settings(BaseSettings):
    """Every limit of docs/design/document-extraction-contract.md §11, as environment variables."""

    model_config = SettingsConfigDict(env_file=None, extra="ignore")

    # The same names the backend reads: MINIO_ACCESS_KEY / MINIO_SECRET_KEY, falling back to the
    # MINIO_ROOT_USER / MINIO_ROOT_PASSWORD the compose deployment keeps in its env file.
    minio_endpoint: str = Field(default="localhost:9000", alias="MINIO_ENDPOINT")
    minio_access_key: str = Field(default="", alias="MINIO_ACCESS_KEY")
    minio_secret_key: str = Field(default="", alias="MINIO_SECRET_KEY")
    minio_root_user: str = Field(default="", alias="MINIO_ROOT_USER")
    minio_root_password: str = Field(default="", alias="MINIO_ROOT_PASSWORD")
    minio_use_ssl: bool = Field(default=False, alias="MINIO_USE_SSL")

    # REDIS_URL wins; otherwise the URL is built from the backend's REDIS_HOST / REDIS_PORT /
    # REDIS_PASSWORD.
    redis_url: str = Field(default="", alias="REDIS_URL")
    redis_host: str = Field(default="localhost", alias="REDIS_HOST")
    redis_port: int = Field(default=6379, alias="REDIS_PORT")
    redis_password: str = Field(default="", alias="REDIS_PASSWORD")
    service_token: str | None = Field(default=None, alias="EXTRACTION_SERVICE_TOKEN")

    ocr_backend: Literal["mistral", "fake"] = Field(default="mistral", alias="OCR_BACKEND")
    mistral_api_key: str | None = Field(default=None, alias="MISTRAL_API_KEY")
    mistral_server_url: str = Field(
        default="https://api.mistral.ai", alias="MISTRAL_OCR_SERVER_URL"
    )
    ocr_model: str = Field(default="mistral-ocr-latest", alias="OCR_MODEL")
    fake_ocr_delay_seconds: float = Field(default=0.0, alias="FAKE_OCR_DELAY_SECONDS")

    # Office input is converted by the same Gotenberg container the backend used to call; unset
    # fails Office jobs with CONVERSION_UNAVAILABLE. The timeout matches the backend converter and
    # the container's API_TIMEOUT.
    gotenberg_url: str | None = Field(default=None, alias="GOTENBERG_URL")
    conversion_timeout_seconds: float = Field(default=600.0, alias="CONVERSION_TIMEOUT_SECONDS")
    # Bounds of the backend's piscina .msg worker (AYC-1003): a few KB of crafted CFBF can drive
    # the parser into unbounded allocation, so it runs in a child process with these limits.
    msg_parse_timeout_seconds: float = Field(default=30.0, alias="MSG_PARSE_TIMEOUT_SECONDS")
    msg_parse_memory_bytes: int = Field(default=256 * 1024 * 1024, alias="MSG_PARSE_MEMORY_BYTES")
    # Email attachments are extracted sequentially with the backend's bounds: at most this many,
    # within this time budget, one level deep (attached emails list their own attachments).
    max_email_attachments: int = Field(default=10, alias="MAX_EMAIL_ATTACHMENTS")
    email_attachment_budget_seconds: float = Field(
        default=300.0, alias="EMAIL_ATTACHMENT_BUDGET_SECONDS"
    )

    max_input_bytes: int = Field(default=500 * 1024 * 1024, alias="MAX_INPUT_BYTES")
    max_pages: int = Field(default=1000, alias="MAX_PAGES")
    ocr_batch_pages: int = Field(default=20, alias="OCR_BATCH_PAGES")
    ocr_batch_bytes: int = Field(default=20 * 1024 * 1024, alias="OCR_BATCH_BYTES")
    ocr_call_timeout_seconds: float = Field(default=120.0, alias="OCR_CALL_TIMEOUT_SECONDS")
    ocr_transient_retries: int = Field(default=3, alias="OCR_TRANSIENT_RETRIES")
    max_job_seconds: float = Field(default=7200.0, alias="MAX_JOB_SECONDS")
    max_concurrent_jobs: int = Field(default=4, alias="MAX_CONCURRENT_JOBS")
    lease_ttl_seconds: int = Field(default=60, alias="LEASE_TTL_SECONDS")
    lease_renew_seconds: float = Field(default=20.0, alias="LEASE_RENEW_SECONDS")
    max_restarts: int = Field(default=2, alias="MAX_RESTARTS")
    orphan_after_seconds: float = Field(default=3600.0, alias="ORPHAN_AFTER_SECONDS")
    record_ttl_seconds: float = Field(default=86400.0, alias="RECORD_TTL_SECONDS")
    janitor_interval_seconds: float = Field(default=30.0, alias="JANITOR_INTERVAL_SECONDS")
    checkpoint_pages: int = Field(default=20, alias="CHECKPOINT_PAGES")
    # Bounds on what one page may make PDFium materialise; past them the text is cut and the
    # result carries page_text_truncated, so a hostile text layer cannot grow the process.
    max_page_chars: int = Field(default=200_000, alias="MAX_PAGE_CHARS")
    max_page_rects: int = Field(default=5_000, alias="MAX_PAGE_RECTS")
    max_document_chars: int = Field(default=20_000_000, alias="MAX_DOCUMENT_CHARS")
    # A page box is not bounded by the file size; renders are downsampled to this many pixels.
    max_render_pixels: int = Field(default=4_000_000, alias="MAX_RENDER_PIXELS")

    scratch_dir: str = Field(default="/tmp/ayunis-extraction", alias="SCRATCH_DIR")
    word_lists_dir: str | None = Field(default="/usr/share/hunspell", alias="WORD_LISTS_DIR")
    replica_id: str = Field(
        default_factory=lambda: f"{socket.gethostname()}:{os.getpid()}", alias="REPLICA_ID"
    )
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    render_dpi: int = Field(default=50, alias="OCR_RULE_RENDER_DPI")
    table_pages_to_ocr: bool = Field(default=True, alias="TABLE_PAGES_TO_OCR")
    blank_ink_ratio: float = Field(default=0.002, alias="OCR_RULE_BLANK_INK_RATIO")
    blank_char_count: int = Field(default=5, alias="OCR_RULE_BLANK_CHAR_COUNT")
    no_text_char_count: int = Field(default=20, alias="OCR_RULE_NO_TEXT_CHAR_COUNT")
    no_text_ink_ratio: float = Field(default=0.01, alias="OCR_RULE_NO_TEXT_INK_RATIO")
    low_coverage: float = Field(default=0.6, alias="OCR_RULE_LOW_COVERAGE")
    garbage_ratio: float = Field(default=0.05, alias="OCR_RULE_GARBAGE_RATIO")
    word_validity: float = Field(default=0.7, alias="OCR_RULE_WORD_VALIDITY")
    word_validity_min_tokens: int = Field(default=30, alias="OCR_RULE_WORD_VALIDITY_MIN_TOKENS")
    table_likelihood: float = Field(default=0.5, alias="OCR_RULE_TABLE_LIKELIHOOD")
    document_ocr_share: float = Field(default=0.9, alias="OCR_RULE_DOCUMENT_OCR_SHARE")

    @model_validator(mode="before")
    @classmethod
    def _drop_empty_values(cls, values: Any) -> Any:
        """`.env` files list every variable, many as `NAME=`; an empty value means the default."""
        if isinstance(values, dict):
            return {key: value for key, value in values.items() if value != ""}
        return values

    @model_validator(mode="after")
    def _fill_connection_fallbacks(self) -> "Settings":
        if not self.minio_access_key:
            self.minio_access_key = self.minio_root_user
        if not self.minio_secret_key:
            self.minio_secret_key = self.minio_root_password
        if not self.redis_url:
            auth = f":{self.redis_password}@" if self.redis_password else ""
            self.redis_url = f"redis://{auth}{self.redis_host}:{self.redis_port}/0"
        return self

    @property
    def ocr_configured(self) -> bool:
        return self.ocr_backend == "fake" or bool(self.mistral_api_key)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
