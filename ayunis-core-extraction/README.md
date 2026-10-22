# Ayunis Core document extraction service

Python service that turns an uploaded document into pages of text for the backend's indexing pipeline. It implements [docs/design/document-extraction-contract.md](../docs/design/document-extraction-contract.md): async jobs addressed by MinIO object reference, an idempotency key per upload, per-page checkpoints for restart recovery, the per-page OCR decision rule, and Mistral OCR dispatched in page ranges.

The backend keeps the source rows, the BullMQ queue, chunking, embeddings and indexing; it talks to this service through `EXTRACTION_SERVICE_URL` (see `ayunis-core-backend/src/domain/sources/infrastructure/extraction/`).

## Layout

```text
app/
  main.py            FastAPI app, lifespan (worker pool, janitor), error bodies
  config.py          every limit and threshold as an environment variable
  api/               request and response models (the contract), routes, bearer token
  jobs/store.py      job records, idempotency index, queue, leases in Redis (Lua for the atomic steps)
  jobs/runtime.py    worker threads, lease keeper, janitor, graceful shutdown
  jobs/service.py    start / status / result / cancel / release
  jobs/pipeline.py   download and hash check, type detection, extractor dispatch
  storage/objects.py MinIO client: streamed download with hash, checkpoints, result, prefix purge
  pdf/               pypdfium2: page text, rendering, signals, decision rule, sub-PDFs
  ocr/               Mistral OCR client and the deterministic fake backend
scripts/             corpus harness, fixture generator, OpenAPI export
contract/            committed OpenAPI document and example payloads the backend tests validate against
tests/               pytest, no network (fakeredis, in-memory object store, synthetic PDFs)
```

## Running locally

```bash
uv sync
uv run uvicorn app.main:app --reload
```

The dev stack (`./dev up` at the repository root) builds and starts the service next to MinIO and Redis; it listens on `localhost:8003 + slot offset`. The backend only routes PDFs through it when `EXTRACTION_SERVICE_URL` is set; put `EXTRACTION_SERVICE_URL=http://localhost:8003` into `ayunis-core-backend/.env.local` (the slot offset is applied at boot) and restart the backend.

By default the dev stack runs the service with `OCR_BACKEND=fake`, which returns deterministic text for every page sent to OCR without calling a provider. For real OCR locally, export `EXTRACTION_OCR_BACKEND=mistral` and `MISTRAL_API_KEY` before `./dev up`.

## Checks

```bash
uv run ruff check .
uv run ruff format --check .
uv run mypy
uv run pytest
```

`scripts/export_contract.py` regenerates `contract/openapi.json` and the example payloads; CI fails when the committed files differ from the app.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_USE_SSL` | `localhost:9000`, empty, empty, `false` | Object store holding inputs, checkpoints and results |
| `REDIS_URL` | `redis://localhost:6379/0` | Job records under the `extraction:` prefix (shared instance, no keys shared with BullMQ) |
| `EXTRACTION_SERVICE_TOKEN` | unset | Bearer token checked on `/v1/*` when set |
| `OCR_BACKEND` | `mistral` | `mistral` or `fake` |
| `MISTRAL_API_KEY`, `MISTRAL_OCR_SERVER_URL`, `OCR_MODEL` | unset, `https://api.mistral.ai`, `mistral-ocr-latest` | OCR provider; without a key pages that need OCR are emitted as `text_fallback` |
| `MAX_INPUT_BYTES` | 500 MB | `INPUT_TOO_LARGE` above this |
| `MAX_PAGES` | 1000 | Cap for `options.maxPages`; `TOO_MANY_PAGES` above the job's limit |
| `OCR_BATCH_PAGES`, `OCR_BATCH_BYTES` | 20, 20 MB | One Mistral call per batch; bounds the restart cost |
| `OCR_CALL_TIMEOUT_SECONDS`, `OCR_TRANSIENT_RETRIES` | 120, 3 | Per call |
| `MAX_JOB_SECONDS` | 7200 | `JOB_TIMEOUT` (retryable) |
| `MAX_CONCURRENT_JOBS` | 4 | Worker threads per replica |
| `LEASE_TTL_SECONDS`, `LEASE_RENEW_SECONDS` | 60, 20 | A job whose lease expires is re-queued by the janitor |
| `MAX_RESTARTS` | 2 | Then `RESTART_LIMIT` |
| `ORPHAN_AFTER_SECONDS` | 3600 | Active job not polled for this long is cancelled and released |
| `RECORD_TTL_SECONDS` | 86400 | Terminal records and their objects are removed after this |
| `CHECKPOINT_PAGES` | 20 | Progress is reported after this many text-layer pages |
| `SCRATCH_DIR` | `/tmp/ayunis-extraction` (`/scratch` in the image) | Wiped on boot |
| `WORD_LISTS_DIR` | `/usr/share/hunspell` | hunspell `de_DE` and `en_US`; without them `wordValidity` is not evaluated |
| `TABLE_PAGES_TO_OCR` | `true` | Rule 7 switch |
| `OCR_RULE_*` | see `app/config.py` | Thresholds of contract §8.2 |

Provider limits: the Mistral OCR documentation fetched on 2026-10-22 states no numeric per-request size or page limit; the batch defaults above are the contract's provisional values and stay well inside any plausible limit.

## OCR decision rule

`app/pdf/signals.py` measures the contract §8.1 signals from one 50 dpi grayscale render and the text page; `app/pdf/decision.py` applies the §8.2 rules in order. Rule version `ocr-rule/1` ships these thresholds (all configurable, see `OCR_RULE_*`):

| Rule | Condition | Decision |
| --- | --- | --- |
| 1 | `options.ocr == always` | OCR, `forced` |
| 2 | `inkRatio < 0.002` and `charCount < 5` | `blank` |
| 3 | `charCount < 20` and `inkRatio >= 0.01` | OCR, `no_text` |
| 4 | `textInkCoverage < 0.6` | OCR, `low_coverage` |
| 5 | `garbageRatio > 0.05` | OCR, `garbage` |
| 6 | `wordValidity < 0.7` (30 or more tokens, dictionaries present) | OCR, `invalid_words` |
| 7 | `tableLikelihood >= 0.5` and `TABLE_PAGES_TO_OCR` | OCR, `table` |
| 8 | otherwise | text layer |

Text rectangles are mapped onto the render by PDFium itself (`PdfBitmap.get_posconv`), so pages with `/Rotate` measure the same as upright ones. Two details beyond the contract text: long straight rulings (table grids, letterhead rules) are masked out of the ink that `textInkCoverage` measures, otherwise every ruled table trips rule 4 before rule 7 and the table cost switch has no effect; and when more than 90 % of a document's pages are routed to OCR the remaining text pages follow with `ocrReason: forced` and the warning `ocr_document_shortcut`.

Measured on the committed fixtures (`tests/test_decision.py` asserts these decisions and that the decisive signal keeps margin to its threshold):

| Fixture page | charCount | inkRatio | textInkCoverage | garbageRatio | wordValidity | tableLikelihood | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| born-digital p1 | 3258 | 0.110 | 1.000 | 0.000 | 1.00 | 0.00 | text |
| blank-scan | 0 | 0.000 | 1.000 | 0.000 | - | 0.00 | blank |
| scan-no-text p1 | 0 | 0.099 | 0.000 | 0.000 | - | 0.00 | OCR `no_text` |
| partial-text-layer | 52 | 0.104 | 0.031 | 0.000 | - | 0.00 | OCR `low_coverage` |
| poor-ocr-layer p1 | 3159 | 0.102 | 0.823 | 0.072 | 0.22 | 0.00 | OCR `garbage` |
| poor-ocr-layer p2 | 3366 | 0.100 | 0.857 | 0.000 | 0.26 | 0.00 | OCR `invalid_words` |
| table | 556 | 0.052 | 0.623 | 0.000 | - | 1.00 | OCR `table` |
| mixed p2 (scan inside a letter) | 0 | 0.102 | 0.000 | 0.000 | - | 0.00 | OCR `no_text` |

The real calibration is the municipal corpus of contract §9, which lives outside the repository:

```bash
CORPUS_DIR=/path/to/corpus uv run python -m scripts.validate_corpus --price-per-page 0.001
```

It writes `decisions-ocr-rule-1.csv` next to the manifest with every page's signals and decision, prints the OCR share per category with rule 7 on and off, the recall of "needs OCR" against the manifest's expectations, and the estimated cost. No OCR is called.

## Threading

PDFium is not thread-safe, so every pypdfium2 call goes through one process-wide lock. Rendering at 50 dpi and text extraction cost milliseconds per page; OCR and MinIO calls run in parallel across the worker threads.

## Licences

`pypdfium2` is Apache-2.0 or BSD-3-Clause (PDFium is BSD-3-Clause). `spylls` (pure Python hunspell) is MPL-2.0. The Debian packages `hunspell-de-de` (igerman98, GPL-2.0-or-later or GPL-3.0) and `hunspell-en-us` (SCOWL, permissive) are data files read at runtime. PyMuPDF is deliberately not used.
