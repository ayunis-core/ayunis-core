import threading
from pathlib import Path

import pytest

from app.config import Settings
from app.errors import ServiceError
from app.jobs.pipeline import detect_type, download_input, run_job
from app.jobs.runtime import JobContext
from app.jobs.store import JobStore
from tests.conftest import InMemoryObjectStore, start_request


def make_context(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path, sha256: str
) -> JobContext:
    created = store.start(start_request(sha256=sha256))
    store.claim(created.job_id, settings.replica_id)
    record = store.get(created.job_id)
    assert record is not None
    scratch = tmp_path / "job"
    scratch.mkdir(parents=True)
    return JobContext(record, store, objects, settings, scratch, threading.Event())


def test_detect_type_recognises_pdf_magic_bytes(tmp_path: Path) -> None:
    pdf = tmp_path / "a.pdf"
    pdf.write_bytes(b"%PDF-1.7\n%...")
    other = tmp_path / "b.bin"
    other.write_bytes(b"PK\x03\x04")

    assert detect_type(pdf) == "pdf"
    assert detect_type(other) == "unknown"


def test_download_verifies_the_hash(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    sha256 = objects.put("org/processing/src/report.pdf", b"%PDF-1.4 content")
    good = make_context(store, objects, settings, tmp_path / "good", sha256)
    bad = make_context(store, objects, settings, tmp_path / "bad", "b" * 64)

    downloaded = download_input(good)
    with pytest.raises(ServiceError) as mismatch:
        download_input(bad)

    assert (downloaded.detected_type, downloaded.size) == ("pdf", 16)
    assert mismatch.value.code == "INPUT_HASH_MISMATCH"


def test_download_reports_missing_and_oversized_input(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    missing = make_context(store, objects, settings, tmp_path / "missing", "c" * 64)
    with pytest.raises(ServiceError) as not_found:
        download_input(missing)
    assert not_found.value.code == "INPUT_NOT_FOUND"

    sha256 = objects.put("org/processing/src/report.pdf", b"%PDF-1.4 " + b"x" * 100)
    small = settings.model_copy(update={"max_input_bytes": 10})
    big = make_context(store, objects, small, tmp_path / "big", sha256)
    with pytest.raises(ServiceError) as too_large:
        download_input(big)
    assert too_large.value.code == "INPUT_TOO_LARGE"
    assert too_large.value.details == {"bytes": 109, "maxBytes": 10}


def test_unknown_input_type_is_unsupported(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path
) -> None:
    sha256 = objects.put("org/processing/src/report.pdf", b"PK\x03\x04 not a pdf")
    context = make_context(store, objects, settings, tmp_path, sha256)

    with pytest.raises(ServiceError) as unsupported:
        run_job(context)

    assert unsupported.value.code == "UNSUPPORTED_TYPE"
