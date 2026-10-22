"""Writes the OpenAPI document the backend's contract test validates against.

Run from the service directory: `uv run python -m scripts.export_contract`.
"""

import json
from pathlib import Path

from app.config import Settings
from app.main import create_app

CONTRACT_DIR = Path(__file__).resolve().parent.parent / "contract"


def export_openapi() -> Path:
    app = create_app(Settings(), run_workers=False)
    target = CONTRACT_DIR / "openapi.json"
    target.write_text(json.dumps(app.openapi(), indent=2, sort_keys=True) + "\n")
    return target


if __name__ == "__main__":
    print(export_openapi())
