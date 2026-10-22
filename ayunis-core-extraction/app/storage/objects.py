import hashlib
import io
import logging
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path

import urllib3
from minio import Minio, S3Error
from minio.commonconfig import CopySource
from minio.deleteobjects import DeleteObject

from app.errors import ServiceError, storage_unavailable

logger = logging.getLogger(__name__)

CHUNK_BYTES = 1024 * 1024


@dataclass(frozen=True)
class ObjectRef:
    bucket: str
    key: str


@dataclass(frozen=True)
class WrittenObject:
    bucket: str
    key: str
    bytes: int
    sha256: str


class ObjectStore:
    """The service only reads the key it was given and writes under the prefix it was given."""

    def __init__(self, client: Minio) -> None:
        self.client = client

    @classmethod
    def from_settings(
        cls, endpoint: str, access_key: str, secret_key: str, secure: bool
    ) -> "ObjectStore":
        return cls(Minio(endpoint, access_key=access_key, secret_key=secret_key, secure=secure))

    def ready(self) -> None:
        try:
            self.client.list_buckets()
        except (S3Error, urllib3.exceptions.HTTPError, OSError) as error:
            raise storage_unavailable(f"MinIO unreachable: {error}") from error

    def object_size(self, ref: ObjectRef) -> int:
        try:
            return int(self.client.stat_object(ref.bucket, ref.key).size or 0)
        except S3Error as error:
            if error.code in ("NoSuchKey", "NoSuchBucket"):
                raise ServiceError(
                    "INPUT_NOT_FOUND", f"No object at {ref.key}", status=404
                ) from error
            raise storage_unavailable(str(error)) from error
        except (urllib3.exceptions.HTTPError, OSError) as error:
            raise storage_unavailable(str(error)) from error

    def download(self, ref: ObjectRef, destination: Path, expected_sha256: str) -> int:
        """Streams the object to disk while hashing it; the hash is checked before use."""
        digest = hashlib.sha256()
        size = 0
        try:
            response = self.client.get_object(ref.bucket, ref.key)
            try:
                with destination.open("wb") as target:
                    for chunk in response.stream(CHUNK_BYTES):
                        digest.update(chunk)
                        target.write(chunk)
                        size += len(chunk)
            finally:
                response.close()
                response.release_conn()
        except S3Error as error:
            if error.code in ("NoSuchKey", "NoSuchBucket"):
                raise ServiceError(
                    "INPUT_NOT_FOUND", f"No object at {ref.key}", status=404
                ) from error
            raise storage_unavailable(str(error)) from error
        except (urllib3.exceptions.HTTPError, OSError) as error:
            raise storage_unavailable(str(error)) from error
        if digest.hexdigest() != expected_sha256:
            raise ServiceError(
                "INPUT_HASH_MISMATCH",
                "Object bytes do not match the hash the job was started with",
                details={"expected": expected_sha256, "actual": digest.hexdigest()},
            )
        return size

    def put_bytes(
        self, ref: ObjectRef, data: bytes, content_type: str = "application/json"
    ) -> WrittenObject:
        try:
            self.client.put_object(
                ref.bucket, ref.key, io.BytesIO(data), len(data), content_type=content_type
            )
        except (S3Error, urllib3.exceptions.HTTPError, OSError) as error:
            raise storage_unavailable(str(error)) from error
        return WrittenObject(ref.bucket, ref.key, len(data), hashlib.sha256(data).hexdigest())

    def put_file(self, ref: ObjectRef, source: Path, content_type: str) -> None:
        """Streams a scratch file into the store without reading it into memory."""
        try:
            self.client.fput_object(ref.bucket, ref.key, str(source), content_type=content_type)
        except (S3Error, urllib3.exceptions.HTTPError, OSError) as error:
            raise storage_unavailable(str(error)) from error

    def get_file(self, ref: ObjectRef, destination: Path) -> bool:
        """Streams an object to disk; False when it does not exist."""
        try:
            response = self.client.get_object(ref.bucket, ref.key)
            try:
                with destination.open("wb") as target:
                    for chunk in response.stream(CHUNK_BYTES):
                        target.write(chunk)
            finally:
                response.close()
                response.release_conn()
        except S3Error as error:
            if error.code in ("NoSuchKey", "NoSuchBucket"):
                return False
            raise storage_unavailable(str(error)) from error
        except (urllib3.exceptions.HTTPError, OSError) as error:
            raise storage_unavailable(str(error)) from error
        return True

    def get_bytes(self, ref: ObjectRef) -> bytes | None:
        try:
            response = self.client.get_object(ref.bucket, ref.key)
            try:
                return bytes(response.read())
            finally:
                response.close()
                response.release_conn()
        except S3Error as error:
            if error.code in ("NoSuchKey", "NoSuchBucket"):
                return None
            raise storage_unavailable(str(error)) from error
        except (urllib3.exceptions.HTTPError, OSError) as error:
            raise storage_unavailable(str(error)) from error

    def copy(self, source: ObjectRef, target: ObjectRef) -> None:
        try:
            self.client.copy_object(
                target.bucket, target.key, CopySource(source.bucket, source.key)
            )
        except (S3Error, urllib3.exceptions.HTTPError, OSError) as error:
            raise storage_unavailable(str(error)) from error

    def list_keys(self, bucket: str, prefix: str) -> Iterator[str]:
        try:
            for item in self.client.list_objects(bucket, prefix=prefix, recursive=True):
                if item.object_name is not None:
                    yield str(item.object_name)
        except (S3Error, urllib3.exceptions.HTTPError, OSError) as error:
            raise storage_unavailable(str(error)) from error

    def delete_prefix(self, bucket: str, prefix: str) -> int:
        keys = list(self.list_keys(bucket, prefix))
        if not keys:
            return 0
        try:
            errors = list(self.client.remove_objects(bucket, [DeleteObject(key) for key in keys]))
        except (S3Error, urllib3.exceptions.HTTPError, OSError) as error:
            raise storage_unavailable(str(error)) from error
        for failed in errors:
            logger.warning(
                "object delete failed",
                extra={"bucket": bucket, "key": failed.name, "reason": failed.message},
            )
        return len(keys) - len(errors)

    def delete(self, ref: ObjectRef) -> None:
        try:
            self.client.remove_object(ref.bucket, ref.key)
        except (S3Error, urllib3.exceptions.HTTPError, OSError) as error:
            raise storage_unavailable(str(error)) from error
