"""Per-page checkpoints under `<keyPrefix>pages/<index, 5 digits>.json` (contract §6)."""

import logging
import re

from pydantic import ValidationError

from app.jobs.runtime import JobContext
from app.result import PageEntry
from app.storage.objects import ObjectRef

logger = logging.getLogger(__name__)

_PAGE_KEY = re.compile(r"pages/(\d{5})\.json$")


class Checkpoints:
    def __init__(self, context: JobContext) -> None:
        self.context = context
        self.bucket = context.request.output.bucket
        self.prefix = context.request.output.key_prefix
        self.pages: dict[int, PageEntry] = {}

    def load_existing(self, page_count: int) -> int:
        """Reads every valid checkpoint a previous attempt left; returns how many were reused."""
        keys = list(self.context.objects.list_keys(self.bucket, f"{self.prefix}pages/"))
        for key in keys:
            match = _PAGE_KEY.search(key)
            if match is None:
                continue
            index = int(match.group(1))
            if index >= page_count:
                continue
            raw = self.context.objects.get_bytes(ObjectRef(self.bucket, key))
            if raw is None:
                continue
            try:
                entry = PageEntry.model_validate_json(raw)
            except ValidationError:
                logger.warning("ignoring unreadable checkpoint", extra={"key": key})
                continue
            if entry.index == index:
                self.pages[index] = entry
        if self.pages:
            logger.info(
                "checkpoints reused",
                extra={"jobId": self.context.job_id, "pages": len(self.pages)},
            )
        return len(self.pages)

    def is_done(self, index: int) -> bool:
        return index in self.pages

    def write(self, entry: PageEntry) -> None:
        self.context.check()
        ref = ObjectRef(self.bucket, f"{self.prefix}pages/{entry.index:05d}.json")
        self.context.objects.put_bytes(ref, entry.model_dump_json(by_alias=True).encode())
        self.pages[entry.index] = entry

    def ordered(self) -> list[PageEntry]:
        return [self.pages[index] for index in sorted(self.pages)]


class MemoryCheckpoints(Checkpoints):
    """Pages kept only in memory: nothing is listed from or written to the object store."""

    def load_existing(self, page_count: int) -> int:
        return 0

    def write(self, entry: PageEntry) -> None:
        self.context.check()
        self.pages[entry.index] = entry
