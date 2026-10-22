"""Conversion through a real Gotenberg: set GOTENBERG_URL to run (CI starts a container).

`<fixture>.expected.txt` holds one line per page with whitespace collapsed, so the comparison
proves the words Gotenberg and pypdfium2 produce without depending on LibreOffice's line breaks.
Regenerate with `RECORD_OFFICE_EXPECTED=1` set next to `GOTENBERG_URL`.
"""

import os
import re
from pathlib import Path

import pytest

from app.config import Settings
from app.jobs.pipeline import run_job
from app.jobs.store import JobStore
from app.result import ExtractionResult
from tests.conftest import FIXTURES, InMemoryObjectStore, make_context, start_request

OFFICE = FIXTURES / "office"
GOTENBERG_URL = os.environ.get("GOTENBERG_URL")
FIXTURE_MIME_TYPES = {
    "letter.docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "slides.pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "letter.odt": "application/vnd.oasis.opendocument.text",
    "slides.odp": "application/vnd.oasis.opendocument.presentation",
    "letter.rtf": "application/rtf",
}

pytestmark = pytest.mark.skipif(not GOTENBERG_URL, reason="GOTENBERG_URL not set")


def normalise(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


@pytest.mark.parametrize("name", sorted(FIXTURE_MIME_TYPES))
def test_fixture_converts_and_extracts_the_expected_text(
    store: JobStore, objects: InMemoryObjectStore, settings: Settings, tmp_path: Path, name: str
) -> None:
    sha256 = objects.put(f"org/processing/src/{name}", (OFFICE / name).read_bytes())
    context = make_context(
        store,
        objects,
        settings.model_copy(update={"gotenberg_url": GOTENBERG_URL}),
        tmp_path,
        start_request(
            key=f"org/processing/src/{name}",
            sha256=sha256,
            file_name=name,
            declared_mime_type=FIXTURE_MIME_TYPES[name],
        ),
    )

    run_job(context)

    prefix = context.request.output.key_prefix
    result = ExtractionResult.model_validate_json(
        objects.objects[("ayunis", f"{prefix}result.json")]
    )
    pages = [normalise(page.text) for page in result.pages]
    expected_file = OFFICE / f"{name}.expected.txt"
    if os.environ.get("RECORD_OFFICE_EXPECTED"):
        expected_file.write_text("\n".join(pages) + "\n")
    assert result.document.detected_type == Path(name).suffix[1:]
    assert result.document.converter == "gotenberg-libreoffice"
    assert all(page.method == "text" for page in result.pages)
    assert pages == expected_file.read_text().splitlines()
