import hashlib
import threading
from collections.abc import Iterator
from pathlib import Path

import fakeredis
import pytest
from fastapi.testclient import TestClient

from app.api.models import StartJobRequest
from app.config import Settings
from app.errors import ServiceError
from app.jobs.runtime import JobContext
from app.jobs.service import JobService
from app.jobs.store import JobStore
from app.main import create_app
from app.office.extractor import register_office_extractor
from app.pdf.extractor import register_pdf_extractor
from app.storage.objects import ObjectRef, ObjectStore, WrittenObject

ORG_ID = "00000000-0000-0000-0000-000000000010"
SOURCE_ID = "00000000-0000-0000-0000-000000000001"
FIXTURES = Path(__file__).parent / "fixtures"

register_pdf_extractor()
register_office_extractor()


class InMemoryObjectStore(ObjectStore):
    """MinIO as a dict; `unavailable` makes every call fail like an unreachable endpoint."""

    def __init__(self) -> None:
        self.objects: dict[tuple[str, str], bytes] = {}
        self.unavailable = False
        self.lock = threading.Lock()

    def _guard(self) -> None:
        if self.unavailable:
            raise ServiceError(
                "STORAGE_UNAVAILABLE", "MinIO unreachable", retryable=True, status=503
            )

    def ready(self) -> None:
        self._guard()

    def object_size(self, ref: ObjectRef) -> int:
        self._guard()
        data = self.objects.get((ref.bucket, ref.key))
        if data is None:
            raise ServiceError("INPUT_NOT_FOUND", f"No object at {ref.key}", status=404)
        return len(data)

    def download(self, ref: ObjectRef, destination: Path, expected_sha256: str) -> int:
        data = self.objects.get((ref.bucket, ref.key))
        self._guard()
        if data is None:
            raise ServiceError("INPUT_NOT_FOUND", f"No object at {ref.key}", status=404)
        actual = hashlib.sha256(data).hexdigest()
        destination.write_bytes(data)
        if actual != expected_sha256:
            raise ServiceError("INPUT_HASH_MISMATCH", "hash mismatch", details={"actual": actual})
        return len(data)

    def put_bytes(
        self, ref: ObjectRef, data: bytes, content_type: str = "application/json"
    ) -> WrittenObject:
        self._guard()
        with self.lock:
            self.objects[(ref.bucket, ref.key)] = data
        return WrittenObject(ref.bucket, ref.key, len(data), hashlib.sha256(data).hexdigest())

    def get_bytes(self, ref: ObjectRef) -> bytes | None:
        self._guard()
        return self.objects.get((ref.bucket, ref.key))

    def put_file(self, ref: ObjectRef, source: Path, content_type: str) -> None:
        self.put_bytes(ref, source.read_bytes(), content_type)

    def get_file(self, ref: ObjectRef, destination: Path) -> bool:
        data = self.get_bytes(ref)
        if data is None:
            return False
        destination.write_bytes(data)
        return True

    def copy(self, source: ObjectRef, target: ObjectRef) -> None:
        self._guard()
        with self.lock:
            self.objects[(target.bucket, target.key)] = self.objects[(source.bucket, source.key)]

    def list_keys(self, bucket: str, prefix: str) -> Iterator[str]:
        self._guard()
        with self.lock:
            keys = sorted(
                key for (b, key) in self.objects if b == bucket and key.startswith(prefix)
            )
        yield from keys

    def delete_prefix(self, bucket: str, prefix: str) -> int:
        keys = list(self.list_keys(bucket, prefix))
        with self.lock:
            for key in keys:
                self.objects.pop((bucket, key), None)
        return len(keys)

    def delete(self, ref: ObjectRef) -> None:
        self._guard()
        with self.lock:
            self.objects.pop((ref.bucket, ref.key), None)

    def put(self, key: str, data: bytes, bucket: str = "ayunis") -> str:
        self.objects[(bucket, key)] = data
        return hashlib.sha256(data).hexdigest()


def make_settings(tmp_path: Path, **overrides: object) -> Settings:
    values: dict[str, object] = {
        "SCRATCH_DIR": str(tmp_path / "scratch"),
        "WORD_LISTS_DIR": str(FIXTURES / "wordlists"),
        "OCR_BACKEND": "fake",
        # Pinned so a GOTENBERG_URL in the environment (CI exports one for the live fixtures)
        # never configures a converter in the unit tests.
        "GOTENBERG_URL": None,
        "LEASE_TTL_SECONDS": 2,
        "LEASE_RENEW_SECONDS": 0.2,
        "JANITOR_INTERVAL_SECONDS": 0.2,
        "MAX_CONCURRENT_JOBS": 2,
        "CHECKPOINT_PAGES": 4,
        "OCR_BATCH_PAGES": 3,
        "REPLICA_ID": "test-replica",
        "LOG_LEVEL": "WARNING",
    }
    values.update(overrides)
    return Settings(**values)  # type: ignore[arg-type]


def start_request(
    source_id: str = SOURCE_ID,
    key: str = "org/processing/src/report.pdf",
    sha256: str = "a" * 64,
    max_pages: int | None = None,
    ocr: str = "auto",
    file_name: str = "report.pdf",
    declared_mime_type: str = "application/pdf",
) -> StartJobRequest:
    return StartJobRequest.model_validate(
        {
            "idempotencyKey": f"v1:{source_id}:{sha256}",
            "owner": {"orgId": ORG_ID, "sourceId": source_id},
            "input": {"bucket": "ayunis", "key": key, "sha256": sha256},
            "fileName": file_name,
            "declaredMimeType": declared_mime_type,
            "output": {"bucket": "ayunis", "keyPrefix": f"org/processing/{source_id}/extraction/"},
            "options": {"maxPages": 1000 if max_pages is None else max_pages, "ocr": ocr},
        }
    )


def make_context(
    store: JobStore,
    objects: InMemoryObjectStore,
    settings: Settings,
    scratch: Path,
    request: StartJobRequest,
) -> JobContext:
    """A claimed job the pipeline can run directly, without the worker pool."""
    created = store.start(request)
    store.pop_queued(1)
    assert store.claim(created.job_id, settings.replica_id) == "claimed"
    record = store.get(created.job_id)
    assert record is not None
    scratch.mkdir(parents=True, exist_ok=True)
    return JobContext(record, store, objects, settings, scratch, threading.Event())


@pytest.fixture
def redis_client() -> fakeredis.FakeRedis:
    return fakeredis.FakeRedis(server=fakeredis.FakeServer())


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return make_settings(tmp_path)


@pytest.fixture
def store(redis_client: fakeredis.FakeRedis, settings: Settings) -> JobStore:
    return JobStore(redis_client, settings.lease_ttl_seconds)


@pytest.fixture
def objects() -> InMemoryObjectStore:
    return InMemoryObjectStore()


@pytest.fixture
def service(store: JobStore, objects: InMemoryObjectStore, settings: Settings) -> JobService:
    return JobService(store, objects, settings)


@pytest.fixture
def client(
    settings: Settings, store: JobStore, objects: InMemoryObjectStore, service: JobService
) -> Iterator[TestClient]:
    app = create_app(settings, run_workers=False, services=(store, objects, service))
    with TestClient(app) as test_client:
        yield test_client
