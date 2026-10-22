"""Writes the contract files the backend's contract test validates against.

Run from the service directory: `uv run python -m scripts.export_contract`.

`contract/openapi.json` is the FastAPI document; `contract/examples/*.json` are payloads built
from the service's own models, so every example is valid for the service by construction and
the backend test proves it can read them.
"""

import json
from pathlib import Path
from typing import Any

from app.api.models import (
    EMPTY_PROGRESS,
    ErrorResponse,
    JobFailure,
    JobProgress,
    JobStatus,
    ResultRef,
)
from app.config import RULE_VERSION, Settings
from app.main import create_app
from app.result import (
    DocumentInfo,
    ExtractionResult,
    PageEntry,
    PageQuality,
    PageSize,
    Timings,
)

CONTRACT_DIR = Path(__file__).resolve().parent.parent / "contract"
EXAMPLES_DIR = CONTRACT_DIR / "examples"

JOB_ID = "0199f1c3b4a5c6d7e8f9a0b1c2d3"
KEY = "v1:00000000-0000-0000-0000-000000000001:" + "9a3e" * 16
PREFIX = (
    "00000000-0000-0000-0000-000000000010/processing/"
    "00000000-0000-0000-0000-000000000001/extraction/"
)
T0, T1, T2, T3 = (
    "2026-10-22T10:00:00.000Z",
    "2026-10-22T10:00:02.000Z",
    "2026-10-22T10:03:40.000Z",
    "2026-10-22T10:04:15.000Z",
)


def _status(**overrides: Any) -> JobStatus:
    base: dict[str, Any] = {
        "job_id": JOB_ID,
        "idempotency_key": KEY,
        "state": "queued",
        "phase": None,
        "attempt": 1,
        "restarts": 0,
        "progress": EMPTY_PROGRESS,
        "result": None,
        "error": None,
        "created_at": T0,
        "started_at": None,
        "updated_at": T0,
        "finished_at": None,
    }
    base.update(overrides)
    return JobStatus(**base)


RESULT_REF = ResultRef(
    bucket="ayunis", key=f"{PREFIX}result.json", bytes=48213, sha256="c3" * 32, page_count=4
)

STATUS_EXAMPLES: dict[str, JobStatus] = {
    "status-queued": _status(),
    "status-running": _status(
        state="running",
        phase="extracting",
        progress=JobProgress(pages_total=4, pages_done=2, pages_ocr=1, pages_text=1),
        started_at=T1,
        updated_at=T2,
    ),
    "status-succeeded": _status(
        state="succeeded",
        progress=JobProgress(pages_total=4, pages_done=4, pages_ocr=1, pages_text=2),
        result=RESULT_REF,
        started_at=T1,
        updated_at=T3,
        finished_at=T3,
    ),
    "status-failed-retryable": _status(
        state="failed",
        attempt=2,
        restarts=1,
        progress=JobProgress(pages_total=4, pages_done=2, pages_ocr=0, pages_text=2),
        error=JobFailure(
            code="OCR_UNAVAILABLE",
            message="Mistral OCR answered 503",
            retryable=True,
            details={"status": 503},
        ),
        started_at=T1,
        updated_at=T3,
        finished_at=T3,
    ),
    "status-failed-final": _status(
        state="failed",
        error=JobFailure(
            code="TOO_MANY_PAGES",
            message="The PDF has 1200 pages, the limit is 1000",
            retryable=False,
            details={"pageCount": 1200, "maxPages": 1000},
        ),
        started_at=T1,
        updated_at=T1,
        finished_at=T1,
    ),
    "status-cancelled": _status(state="cancelled", updated_at=T2, finished_at=T2),
}

ERROR_EXAMPLES: dict[str, ErrorResponse] = {
    "error-idempotency-conflict": ErrorResponse(
        error=JobFailure(
            code="IDEMPOTENCY_CONFLICT",
            message="Idempotency key exists with a different input or output",
            retryable=False,
            details={"jobId": JOB_ID},
        )
    ),
    "error-job-not-found": ErrorResponse(
        error=JobFailure(
            code="JOB_NOT_FOUND", message=f"Unknown or expired job {JOB_ID}", retryable=False
        )
    ),
    "error-service-unavailable": ErrorResponse(
        error=JobFailure(code="SERVICE_UNAVAILABLE", message="Redis unreachable", retryable=True)
    ),
}


def _page(index: int, text: str, method: Any, reason: Any, quality: PageQuality) -> PageEntry:
    return PageEntry(
        index=index,
        number=index + 1,
        text=text,
        method=method,
        ocr_reason=reason,
        quality=quality,
        size=PageSize(width=595.3, height=841.9),
    )


RESULT_EXAMPLE = ExtractionResult(
    job_id=JOB_ID,
    idempotency_key=KEY,
    document=DocumentInfo(
        file_name="report.pdf",
        declared_mime_type="application/pdf",
        detected_type="pdf",
        page_count=4,
        converter=None,
        ocr_model="mistral-ocr-latest",
        rule_version=RULE_VERSION,
        pages_ocr=1,
        pages_text=2,
        pages_blank=1,
        warnings=["ocr_page_count_mismatch"],
        timings=Timings(
            download_ms=1200, conversion_ms=0, analysis_ms=980, ocr_ms=6100, total_ms=8400
        ),
    ),
    pages=[
        _page(
            0,
            "Stadt Musterhausen\nBeschlussvorlage 2024/17",
            "text",
            None,
            PageQuality(
                char_count=2310,
                ink_ratio=0.061,
                text_ink_coverage=0.97,
                garbage_ratio=0.0,
                word_validity=0.94,
                table_likelihood=0.05,
            ),
        ),
        _page(
            1,
            "| Gebühr | Betrag |\n| --- | --- |\n| Gruppe 1 | 117,00 € |",
            "ocr",
            "table",
            PageQuality(
                char_count=556,
                ink_ratio=0.052,
                text_ink_coverage=0.62,
                garbage_ratio=0.0,
                word_validity=None,
                table_likelihood=1.0,
            ),
        ),
        _page(
            2,
            "",
            "blank",
            None,
            PageQuality(
                char_count=0,
                ink_ratio=0.0,
                text_ink_coverage=1.0,
                garbage_ratio=0.0,
                word_validity=None,
                table_likelihood=0.0,
            ),
        ),
        _page(
            3,
            "Eingegangen am 12.03.2024",
            "text_fallback",
            "low_coverage",
            PageQuality(
                char_count=52,
                ink_ratio=0.104,
                text_ink_coverage=0.03,
                garbage_ratio=0.0,
                word_validity=None,
                table_likelihood=0.0,
            ),
        ),
    ],
)


def _write(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=False) + "\n")


def export_openapi() -> Path:
    app = create_app(Settings(), run_workers=False)
    target = CONTRACT_DIR / "openapi.json"
    _write(target, app.openapi())
    return target


def export_examples() -> list[Path]:
    written = []
    for name, status in STATUS_EXAMPLES.items():
        written.append(EXAMPLES_DIR / f"{name}.json")
        _write(written[-1], status.model_dump(by_alias=True))
    for name, error in ERROR_EXAMPLES.items():
        written.append(EXAMPLES_DIR / f"{name}.json")
        _write(written[-1], error.model_dump(by_alias=True))
    written.append(EXAMPLES_DIR / "result.json")
    _write(written[-1], RESULT_EXAMPLE.model_dump(by_alias=True))
    return written


if __name__ == "__main__":
    print(export_openapi())
    for path in export_examples():
        print(path)
