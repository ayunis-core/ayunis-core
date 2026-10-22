from collections.abc import Callable
from pathlib import Path

import httpx
import pytest

from app.convert import gotenberg
from app.convert.gotenberg import GotenbergConverter, classify_status
from app.errors import ServiceError

Handler = Callable[[httpx.Request], httpx.Response]


def fake_gotenberg(monkeypatch: pytest.MonkeyPatch, handler: Handler) -> list[httpx.Request]:
    """Routes the converter's client through a mock transport; returns the requests it sent."""
    requests: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return handler(request)

    monkeypatch.setattr(
        gotenberg,
        "default_client",
        lambda url, timeout: httpx.Client(
            base_url=url, transport=httpx.MockTransport(respond), timeout=timeout
        ),
    )
    return requests


def test_conversion_streams_the_file_up_and_the_pdf_down(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    source = tmp_path / "input"
    source.write_bytes(b"PK\x03\x04 office bytes")
    target = tmp_path / "converted.pdf"
    requests = fake_gotenberg(
        monkeypatch, lambda request: httpx.Response(200, content=b"%PDF-1.7 converted")
    )

    size = GotenbergConverter("http://gotenberg:3000", 10).convert(source, "Vorlage.docx", target)

    assert size == 18
    assert target.read_bytes() == b"%PDF-1.7 converted"
    (request,) = requests
    assert request.url == "http://gotenberg:3000/forms/libreoffice/convert"
    body = request.read()
    assert b'filename="Vorlage.docx"' in body
    assert b"PK\x03\x04 office bytes" in body


@pytest.mark.parametrize(
    ("status", "code", "retryable"),
    [
        (400, "UNPROCESSABLE_DOCUMENT", False),
        (413, "INPUT_TOO_LARGE", False),
        (503, "CONVERSION_UNAVAILABLE", True),
        (504, "CONVERSION_FAILED", True),
        (500, "CONVERSION_FAILED", True),
    ],
)
def test_status_classification_mirrors_the_backend_converter(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, status: int, code: str, retryable: bool
) -> None:
    source = tmp_path / "input"
    source.write_bytes(b"x")
    fake_gotenberg(monkeypatch, lambda request: httpx.Response(status, text="nope"))

    with pytest.raises(ServiceError) as failure:
        GotenbergConverter("http://gotenberg:3000", 10).convert(
            source, "a.docx", tmp_path / "out.pdf"
        )

    assert (failure.value.code, failure.value.retryable) == (code, retryable)
    assert failure.value.details is not None
    assert failure.value.details["status"] == status
    assert classify_status(status, "").code == code


@pytest.mark.parametrize(
    ("error", "code"),
    [
        (httpx.ReadTimeout("slow"), "CONVERSION_FAILED"),
        (httpx.ConnectError("refused"), "CONVERSION_UNAVAILABLE"),
    ],
)
def test_transport_failures_are_retryable(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, error: Exception, code: str
) -> None:
    source = tmp_path / "input"
    source.write_bytes(b"x")

    def raise_error(request: httpx.Request) -> httpx.Response:
        raise error

    fake_gotenberg(monkeypatch, raise_error)

    with pytest.raises(ServiceError) as failure:
        GotenbergConverter("http://gotenberg:3000", 10).convert(
            source, "a.docx", tmp_path / "out.pdf"
        )

    assert (failure.value.code, failure.value.retryable) == (code, True)


def test_a_response_over_the_budget_is_cut_and_rejected(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    source = tmp_path / "input"
    source.write_bytes(b"x")
    target = tmp_path / "out.pdf"
    fake_gotenberg(monkeypatch, lambda request: httpx.Response(200, content=b"%PDF" + b"0" * 100))

    with pytest.raises(ServiceError) as failure:
        GotenbergConverter("http://gotenberg:3000", 10).convert(source, "a.docx", target, 50)

    assert failure.value.code == "INPUT_TOO_LARGE"
    assert failure.value.retryable is False
    assert not target.exists()
