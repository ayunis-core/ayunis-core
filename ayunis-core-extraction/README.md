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
  jobs/extractors.py type detection (magic bytes, then declared type and extension) and registry
  storage/objects.py MinIO client: streamed download with hash, checkpoints, result, prefix purge
  pdf/               pypdfium2: page text, rendering, signals, decision rule, sub-PDFs
  ocr/               Mistral OCR client and the deterministic fake backend
  convert/           Gotenberg LibreOffice route, streamed both ways
  office/            Office input: convert, store converted.pdf under the prefix, run the PDF path
  email/             .eml (stdlib email), .msg (olefile in a bounded child process), text files
scripts/             corpus harness, fixture generators, OpenAPI export
contract/            committed OpenAPI document and example payloads the backend tests validate against
tests/               pytest, no network (fakeredis, in-memory object store, synthetic PDFs)
```

## Running locally

```bash
uv sync
uv run uvicorn app.main:app --reload
```

The dev stack (`./dev up` at the repository root) builds and starts the service next to MinIO, Redis and Gotenberg; it listens on `localhost:8003 + slot offset`. The backend routes PDF, Office, email and text uploads through it when `EXTRACTION_SERVICE_URL` is set (audio and spreadsheets stay in the API); put `EXTRACTION_SERVICE_URL=http://localhost:8003` into `ayunis-core-backend/.env.local` (the slot offset is applied at boot) and restart the backend.

By default the dev stack runs the service with `OCR_BACKEND=fake`, which returns deterministic text for every page sent to OCR without calling a provider. For real OCR locally, export `EXTRACTION_OCR_BACKEND=mistral` and `MISTRAL_API_KEY` before `./dev up`.

## Checks

```bash
uv run ruff check .
uv run ruff format --check .
uv run mypy
uv run pytest
```

`uv run python -m scripts.export_contract` regenerates `contract/openapi.json` and the example payloads; CI fails when the committed files differ from the app.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_USE_SSL` | `localhost:9000`, empty, empty, `false` | Object store holding inputs, checkpoints and results |
| `REDIS_URL` | `redis://localhost:6379/0` | Job records under the `extraction:` prefix (shared instance, no keys shared with BullMQ) |
| `EXTRACTION_SERVICE_TOKEN` | unset | Bearer token checked on `/v1/*` when set |
| `GOTENBERG_URL` | unset | The Gotenberg container Office input is converted with; unset fails Office jobs with `CONVERSION_UNAVAILABLE` |
| `CONVERSION_TIMEOUT_SECONDS` | 600 | Per conversion, like the backend converter and the container's `API_TIMEOUT` |
| `MSG_PARSE_TIMEOUT_SECONDS`, `MSG_PARSE_MEMORY_BYTES` | 30, 256 MB | Bounds of the `.msg` child process (AYC-1003) |
| `MAX_EMAIL_ATTACHMENTS`, `EMAIL_ATTACHMENT_BUDGET_SECONDS` | 10, 300 | How many attachments of one email are extracted, and for how long new ones are started |
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

## OCR dispatch

Pages the rule routes to OCR are grouped in document order into sub-PDFs of at most `OCR_BATCH_PAGES` pages and `OCR_BATCH_BYTES` bytes (`app/ocr/batching.py`; a batch over the byte limit is halved until it fits). Each batch is one provider call; every page of the batch is checkpointed before the next call, so a restart repeats at most one batch.

`OCR_BACKEND=mistral` (`app/ocr/mistral.py`) posts the sub-PDF inline to `/v1/ocr` with the same request shape as the backend's in-process Mistral handler: image text annotations requested, image bytes not returned. Failures map to contract §10 codes: Mistral `400 document_parser_invalid_file` / `invalid_request_file` and every `422` are `UNPROCESSABLE_DOCUMENT`, `401`/`403` are `OCR_UNAUTHORIZED`, `408`/`429`/`5xx` and connection failures are retried `OCR_TRANSIENT_RETRIES` times with exponential backoff and then `OCR_UNAVAILABLE`, a client deadline is `OCR_TIMEOUT`, and any other `4xx` is `OCR_REJECTED` with `details.status`.

A provider call runs on its own thread while the job keeps checking its state every second: a cancel, release, lost lease or shutdown interrupts the job at once, the late response is dropped, and the backend's stop check runs before every attempt, so a cancelled job never re-sends the document on a retry (contract §7.1).

`OCR_BACKEND=fake` (`app/ocr/fake.py`) returns `[fake-ocr <sha> page i/n]` plus the page's text layer, deterministically and without network; `FAKE_OCR_DELAY_SECONDS` slows it down for restart demonstrations. Without a configured backend, OCR pages are emitted as `text_fallback` and the result carries the warning `ocr_not_configured`.

## Office, email and text input

Type detection (`app/jobs/extractors.py`) reads the bytes first: `%PDF`, zip-based Office (`word/`, `ppt/`, or the ODF `mimetype` entry), `{\rtf`, and compound files (an Outlook message carries `__properties_version1.0`; `.doc`, `.ppt` and `.xls` are recognised but unsupported). `eml`, `txt` and `md` have no signature and follow the declared MIME type, then the extension, in the backend's `detectFileType` order.

**Office** (`docx`, `pptx`, `odt`, `odp`, `rtf`) goes through Gotenberg's LibreOffice route (`app/convert/gotenberg.py`): the input streams from scratch disk into the multipart request and the PDF streams back to disk, with the file named by the detected type so LibreOffice picks the right import filter. The PDF is stored as `<keyPrefix>converted.pdf` and every later run of the job (retry, restart, or a yield on shutdown) reuses it instead of converting again (contract §6), then the PDF path runs unchanged with `document.converter = gotenberg-libreoffice` and `timings.conversionMs`. Failure classification mirrors the backend's `gotenberg-converter.service.ts`: `400` is the document's fault (`UNPROCESSABLE_DOCUMENT`), `413` is `INPUT_TOO_LARGE`, `503` or an unreachable host is `CONVERSION_UNAVAILABLE` and a timeout or any other status is `CONVERSION_FAILED`, both retryable. A cancel, release, lost lease or shutdown aborts the conversion in flight like an OCR call.

**Email** is one page (contract §4) in the backend's flattened shape: a `From`/`To`/`Cc`/`Subject`/`Date`/`Attachments` header block, a blank line, then the body (text part preferred, HTML rendered to text the way mailparser's html-to-text fallback does, minus its 80-column wrap). `.eml` is parsed with the standard library's `email` package; `.msg` with `olefile` in a child process capped at `MSG_PARSE_MEMORY_BYTES` and `MSG_PARSE_TIMEOUT_SECONDS` (the backend's piscina bounds, AYC-1003), and any way that child fails is `UNPROCESSABLE_DOCUMENT`, never an outage. Non-Unicode `.msg` strings and binary HTML bodies are decoded with the message's codepage, Windows-1252 when it records none. An `.eml`'s attachments follow the message as `--- Attachment: name ---` sections, like the backend's `RetrieveFileContentUseCase`: text files inline, attached emails flattened one level deep (their own attachments only listed), PDFs and Office documents through the same conversion, analysis and OCR as a direct upload but kept in memory, at most `MAX_EMAIL_ATTACHMENTS` within `EMAIL_ATTACHMENT_BUDGET_SECONDS`, and a document the service cannot read leaves a note. An outage inside an attachment (converter or OCR unavailable) fails the job retryably rather than indexing the email without it.

**Plain text and Markdown** pass through as one page, UTF-8 with the BOM removed; a file with no text is `EMPTY_DOCUMENT`.

`tests/fixtures/office`, `tests/fixtures/email` and `tests/fixtures/text` hold one fixture per format with its expected output. The Office expectations come from a real Gotenberg (`tests/test_office_gotenberg.py`, run when `GOTENBERG_URL` is set, as CI does); the email fixtures also carry `.backend.txt`, the text the backend's own `parseEml` and `extractTextFromMsg` produce, and `tests/test_email.py` states where the service differs.

## Contract with the backend

`contract/openapi.json` and `contract/examples/*.json` are generated from the service's own models by `scripts/export_contract.py`; CI fails when they drift from the app. The backend spec `ayunis-core-backend/src/domain/sources/infrastructure/extraction/extraction-contract.spec.ts` validates what its HTTP adapter sends against the request schemas, checks that every field its port reads is required in the response schemas, and parses the example statuses, errors and result through its own mapping code.

## Threading

PDFium is not thread-safe, so every pypdfium2 call goes through one process-wide lock. Rendering at 50 dpi and text extraction cost milliseconds per page; OCR and MinIO calls run in parallel across the worker threads.

## Licences

`pypdfium2` is Apache-2.0 or BSD-3-Clause (PDFium is BSD-3-Clause). `spylls` (pure Python hunspell) is MPL-2.0. `olefile` is BSD-2-Clause; `extract-msg` was not used because of its GPL-3.0 licence. The Debian packages `hunspell-de-de` (igerman98, GPL-2.0-or-later or GPL-3.0) and `hunspell-en-us` (SCOWL, permissive) are data files read at runtime. PyMuPDF is deliberately not used.
