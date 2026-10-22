"""Mistral OCR over HTTP, one call per batch sub-PDF, with the backend's failure classification.

The request shape mirrors ayunis-core-backend's MistralFileRetrieverHandler so the e2e OCR mock
and the provider see the same call: the document travels inline as a data URL (the EU endpoint
has no Files API), image bytes are not returned, and image text annotations are requested.
"""

import base64
import json
import logging
import threading
import time
from collections.abc import Callable
from typing import Any

import httpx

from app.errors import ServiceError
from app.ocr.backend import OcrCall, StopCheck

logger = logging.getLogger(__name__)

IMAGE_TEXT_ANNOTATION_FORMAT = {
    "type": "json_schema",
    "json_schema": {
        "name": "image_text",
        "description": "Extract text visible inside an image embedded in a document",
        "schema": {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "A verbatim transcription of all visible text in reading order",
                }
            },
            "required": ["text"],
            "additionalProperties": False,
        },
        "strict": True,
    },
}

DOCUMENT_REJECTION_TYPES = {"invalid_request_file", "document_parser_invalid_file"}
TRANSIENT_STATUSES = {408, 429, 500, 502, 503, 504}


class MistralOcrBackend:
    def __init__(
        self,
        api_key: str,
        server_url: str,
        model: str,
        timeout_seconds: float,
        transient_retries: int,
        client_factory: Callable[[], httpx.Client] | None = None,
    ) -> None:
        self.model = model
        self.transient_retries = transient_retries
        self._headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        self._client_factory = client_factory or (
            lambda: httpx.Client(
                base_url=server_url.rstrip("/"),
                timeout=httpx.Timeout(timeout_seconds, connect=10.0),
            )
        )

    def call(self, pdf_bytes: bytes, page_count: int, check: StopCheck | None = None) -> OcrCall:
        body = {
            "model": self.model,
            "document": {
                "type": "document_url",
                "document_url": "data:application/pdf;base64,"
                + base64.b64encode(pdf_bytes).decode(),
            },
            "include_image_base64": False,
            "bbox_annotation_format": IMAGE_TEXT_ANNOTATION_FORMAT,
        }
        client = self._client_factory()
        client.headers.update(self._headers)
        return MistralOcrCall(client, body, page_count, check, self.transient_retries)

    def ocr_pdf(
        self, pdf_bytes: bytes, page_count: int, check: StopCheck | None = None
    ) -> list[str]:
        return self.call(pdf_bytes, page_count, check).run()


class MistralOcrCall:
    """One batch: its own connection, closed by `abort` from the job's thread (contract §7.1)."""

    def __init__(
        self,
        client: httpx.Client,
        body: dict[str, Any],
        page_count: int,
        check: StopCheck | None,
        transient_retries: int,
    ) -> None:
        self.client = client
        self.body = body
        self.page_count = page_count
        self.check = check
        self.transient_retries = transient_retries
        self.aborted = threading.Event()

    def run(self) -> list[str]:
        try:
            return _texts_from_response(self._send_with_retries(), self.page_count)
        finally:
            self.client.close()

    def abort(self) -> None:
        self.aborted.set()
        self.client.close()

    def _send_with_retries(self) -> dict[str, Any]:
        attempt = 0
        while True:
            attempt += 1
            if self.check is not None:
                self.check()
            if self.aborted.is_set():
                raise ServiceError("OCR_UNAVAILABLE", "OCR call aborted", retryable=True)
            try:
                return self._send()
            except ServiceError as error:
                if not error.retryable or attempt > self.transient_retries:
                    raise
                delay = 2 ** (attempt - 1)
                logger.warning(
                    "OCR call failed, retrying",
                    extra={"code": error.code, "attempt": attempt, "delaySeconds": delay},
                )
                time.sleep(delay)

    def _send(self) -> dict[str, Any]:
        try:
            response = self.client.post("/v1/ocr", json=self.body)
        except httpx.TimeoutException as error:
            raise ServiceError(
                "OCR_TIMEOUT", "Mistral OCR call timed out", retryable=True
            ) from error
        except (httpx.HTTPError, RuntimeError) as error:
            # RuntimeError: the client was closed by `abort` while the request was in flight.
            raise ServiceError(
                "OCR_UNAVAILABLE", f"Mistral OCR unreachable: {error}", retryable=True
            ) from error
        if response.status_code == 200:
            try:
                parsed: dict[str, Any] = response.json()
            except ValueError as error:
                raise ServiceError(
                    "OCR_UNAVAILABLE", "Mistral OCR returned no JSON", retryable=True
                ) from error
            return parsed
        raise classify_failure(response.status_code, response.text)


def classify_failure(status: int, text: str) -> ServiceError:
    """Contract §10.2: document faults settle, auth faults alert, the rest retry or reject."""
    body = _parse_body(text)
    details: dict[str, Any] = {"status": status}
    error_type = body.get("type") if isinstance(body.get("type"), str) else None
    if error_type:
        details["type"] = error_type
    if status == 400 and error_type == "document_parser_too_many_pages":
        return ServiceError(
            "TOO_MANY_PAGES", "Mistral OCR rejected the batch size", details=details
        )
    if status == 422 or (status == 400 and error_type in DOCUMENT_REJECTION_TYPES):
        return ServiceError(
            "UNPROCESSABLE_DOCUMENT", "Mistral OCR rejected the document", details=details
        )
    if status in (401, 403):
        return ServiceError(
            "OCR_UNAUTHORIZED", "Mistral OCR rejected the credentials", details=details
        )
    if status in TRANSIENT_STATUSES:
        return ServiceError(
            "OCR_UNAVAILABLE", f"Mistral OCR answered {status}", retryable=True, details=details
        )
    if 400 <= status < 500:
        return ServiceError(
            "OCR_REJECTED", f"Mistral OCR rejected the request ({status})", details=details
        )
    return ServiceError(
        "OCR_UNAVAILABLE", f"Mistral OCR answered {status}", retryable=True, details=details
    )


def _parse_body(text: str) -> dict[str, Any]:
    try:
        parsed = json.loads(text)
    except ValueError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _texts_from_response(response: dict[str, Any], page_count: int) -> list[str]:
    """The provider's pages in index order; the caller pads or cuts and records a mismatch."""
    pages = response.get("pages")
    if not isinstance(pages, list):
        raise ServiceError("OCR_UNAVAILABLE", "Mistral OCR response has no pages", retryable=True)
    ordered = sorted(pages, key=lambda p: int(p.get("index", 0)))
    return [_page_text(page) for page in ordered[:page_count]]


def _page_text(page: dict[str, Any]) -> str:
    parts = [str(page.get("markdown") or "")]
    for image in page.get("images") or []:
        annotation = image.get("image_annotation") if isinstance(image, dict) else None
        if annotation:
            parts.append(_annotation_text(annotation))
    return "\n\n".join(part.strip() for part in parts if part and part.strip())


def _annotation_text(annotation: str) -> str:
    try:
        parsed = json.loads(annotation)
    except ValueError:
        return ""
    text = parsed.get("text") if isinstance(parsed, dict) else None
    return text.strip() if isinstance(text, str) else ""
