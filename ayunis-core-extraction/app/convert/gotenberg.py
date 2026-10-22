"""Office to PDF through Gotenberg's LibreOffice route, streamed in both directions.

The failure classification mirrors the backend's `gotenberg-converter.service.ts` and contract
§10: only a 400 is the document's fault, a 503 or an unreachable host is `CONVERSION_UNAVAILABLE`,
a timeout or any other status is `CONVERSION_FAILED`; both are retryable because Gotenberg is our
own service and an outage must keep alerting rather than fail the document.
"""

from collections.abc import Callable
from pathlib import Path

import httpx

from app.config import Settings
from app.errors import ServiceError

CONVERTER_NAME = "gotenberg-libreoffice"
CONVERT_PATH = "/forms/libreoffice/convert"
CHUNK_BYTES = 1024 * 1024
ERROR_BODY_BYTES = 4096

ClientFactory = Callable[[], httpx.Client]


def default_client(url: str, timeout_seconds: float) -> httpx.Client:
    return httpx.Client(
        base_url=url.rstrip("/"), timeout=httpx.Timeout(timeout_seconds, connect=10.0)
    )


class GotenbergConverter:
    def __init__(self, url: str, timeout_seconds: float) -> None:
        self.url = url
        self.timeout_seconds = timeout_seconds

    def call(
        self, source: Path, file_name: str, target: Path, max_bytes: int | None = None
    ) -> "ConversionCall":
        return ConversionCall(
            default_client(self.url, self.timeout_seconds), source, file_name, target, max_bytes
        )

    def convert(
        self, source: Path, file_name: str, target: Path, max_bytes: int | None = None
    ) -> int:
        return self.call(source, file_name, target, max_bytes).run()


class ConversionCall:
    """One conversion: its own connection, closed by `abort` from the job's thread."""

    def __init__(
        self,
        client: httpx.Client,
        source: Path,
        file_name: str,
        target: Path,
        max_bytes: int | None = None,
    ) -> None:
        self.client = client
        self.source = source
        self.file_name = file_name
        self.target = target
        self.max_bytes = max_bytes

    def run(self) -> int:
        """Uploads the file from disk and writes the PDF to disk; returns the PDF's size.

        The response is cut at `max_bytes`: nothing bounds what LibreOffice makes of a document,
        and the PDF must stay inside the input budget the job was admitted with.
        """
        try:
            with self.source.open("rb") as upload:
                files = {"files": (self.file_name, upload, "application/octet-stream")}
                with self.client.stream("POST", CONVERT_PATH, files=files) as response:
                    if response.status_code != 200:
                        raise classify_status(response.status_code, _error_body(response))
                    return _write_body(response, self.target, self.max_bytes)
        except httpx.TimeoutException as error:
            raise ServiceError(
                "CONVERSION_FAILED", "Gotenberg conversion timed out", retryable=True
            ) from error
        except (httpx.HTTPError, RuntimeError) as error:
            # RuntimeError: the client was closed by `abort` while the request was in flight.
            raise ServiceError(
                "CONVERSION_UNAVAILABLE", f"Gotenberg unreachable: {error}", retryable=True
            ) from error
        finally:
            self.client.close()

    def abort(self) -> None:
        self.client.close()


def classify_status(status: int, body: str) -> ServiceError:
    if status == 400:
        return ServiceError(
            "UNPROCESSABLE_DOCUMENT",
            "Gotenberg rejected the document",
            details={"status": status, "reason": body},
        )
    if status == 413:
        return ServiceError(
            "INPUT_TOO_LARGE", "Gotenberg rejected the document size", details={"status": status}
        )
    if status == 503:
        return ServiceError(
            "CONVERSION_UNAVAILABLE",
            "Gotenberg is unavailable",
            retryable=True,
            details={"status": status},
        )
    if status == 504:
        return ServiceError(
            "CONVERSION_FAILED",
            "Gotenberg conversion timed out",
            retryable=True,
            details={"status": status},
        )
    return ServiceError(
        "CONVERSION_FAILED",
        f"Gotenberg conversion failed (HTTP {status})",
        retryable=True,
        details={"status": status, "reason": body},
    )


def resolve_converter(settings: Settings) -> GotenbergConverter | None:
    if not settings.gotenberg_url:
        return None
    return GotenbergConverter(settings.gotenberg_url, settings.conversion_timeout_seconds)


def _error_body(response: httpx.Response) -> str:
    collected = b""
    for chunk in response.iter_bytes():
        collected += chunk
        if len(collected) >= ERROR_BODY_BYTES:
            break
    return collected[:ERROR_BODY_BYTES].decode("utf-8", "replace").strip()


def _write_body(response: httpx.Response, target: Path, max_bytes: int | None) -> int:
    size = 0
    with target.open("wb") as handle:
        for chunk in response.iter_bytes(CHUNK_BYTES):
            size += len(chunk)
            if max_bytes is not None and size > max_bytes:
                handle.close()
                target.unlink(missing_ok=True)
                raise ServiceError(
                    "INPUT_TOO_LARGE",
                    f"The converted PDF exceeds {max_bytes} bytes",
                    details={"maxBytes": max_bytes},
                )
            handle.write(chunk)
    return size
