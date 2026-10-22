# Document extraction service contract

Ticket: AYC-1406 (design), parent AYC-1405. Built against by AYC-1408 (backend port and consumer) and AYC-1409 (service). Status: draft for review by the backend owner and the proposal reviewer.

This document is the contract between `ayunis-core-backend` and the new Python extraction service (`ayunis-core-extraction`, modelled on `ayunis-core-anonymize`). It covers the job API, the result format, idempotency and retry reconnection, restart recovery, cancellation, cleanup, the per-page OCR decision rule and its validation corpus, the failure-code mapping, and the service's limits. It contains no implementation; where a value is provisional it is marked as such.

## 1. Scope and division of responsibility

| Concern | Owner | Notes |
| --- | --- | --- |
| Upload, source row, status, `processingError` | Backend | Unchanged. |
| Staging the input in MinIO, content hash | Backend | Streams the upload to MinIO and computes SHA-256 while streaming. |
| BullMQ `document-processing` queue, three attempts | Backend | The consumer becomes an I/O-bound poller. |
| Type detection and routing | Backend | Decides which types go to the service (see §1.1). |
| Conversion (Gotenberg), PDF handling (pypdfium2), per-page OCR decision, Mistral OCR calls, email formats | Service | Service calls Gotenberg and Mistral directly; the backend no longer does. |
| Page progress | Service, read by backend | Shipped in the first release. |
| Chunking, embeddings, pgvector, knowledge-base membership, org deletion locks | Backend | Unchanged. No partial indexing in the first release. |
| Result object and checkpoints in MinIO | Service writes, backend owns the prefix | See §7. |
| Spreadsheets and CSV | Backend | Out of scope for the service. |
| Audio transcription | Backend | Stays on the existing transcription provider. |

### 1.1 Type routing

| Detected type | Today | New |
| --- | --- | --- |
| `pdf` | Mistral OCR whole file, pdf-parse fallback | Service |
| Office (`docx`, `pptx`, `odt`, `odp`; the service also accepts `rtf`) | Gotenberg in backend, then as PDF | Service (AYC-1410): the service calls Gotenberg, then runs its PDF path |
| `eml`, `msg` | Backend parsers | Service (AYC-1410); the backend parsers stay for the in-process path while `EXTRACTION_SERVICE_URL` is unset |
| `txt`, `md` | Backend | Service (AYC-1410), one page; keeps every upload type on one path |
| Audio | Backend transcription | Backend |
| `csv`, `xlsx`, ... | Backend spreadsheet parser | Backend |

The backend decides routing before enqueueing. The service rejects a type it does not handle with `UNSUPPORTED_TYPE`; the backend treats that as a programming error (`PROCESSING_FAILED`), not a user error, because the type was already validated at upload.

## 2. Service shape

- Python 3.11+, FastAPI, `uv`, same Dockerfile and compose conventions as `ayunis-core-anonymize`. Reached as `http://extraction:8000` inside the compose network; backend env `EXTRACTION_SERVICE_URL`.
- PDF library: `pypdfium2` (Apache-2.0 or BSD-3-Clause; PDFium is BSD-3-Clause). PyMuPDF is not used (AGPL or commercial). `pdfplumber` (MIT) may be added later for table-heavy pages if §9 validation shows the need.
- Horizontally scalable and stateless in process. Shared state lives in two places only: job records, claims and leases in Redis (the existing instance, key prefix `extraction:`, no keys shared with BullMQ), and payload in MinIO (input read by reference, checkpoints and result written by reference). A replica may die at any time; §6 defines recovery.
- Internal network only, like Gotenberg and the anonymize service. An optional shared bearer token (`EXTRACTION_SERVICE_TOKEN`, checked when set) protects against accidental exposure; it is not a tenant boundary. Tenant isolation is the backend's job: the service only ever reads the object key it was given and writes under the prefix it was given.
- `GET /health` (liveness, no dependencies) and `GET /ready` (Redis and MinIO reachable). Both report `contractVersion: 1`.

## 3. Job API

All endpoints are under `/v1`. Bodies are JSON. Errors use `{ "error": { "code", "message", "retryable" } }` with the codes in §10.

### 3.1 Start a job

`POST /v1/jobs`

```json
{
  "idempotencyKey": "v1:5f1c…-sourceId:9a3e…-sha256",
  "owner": { "orgId": "uuid", "sourceId": "uuid" },
  "input": { "bucket": "ayunis", "key": "<orgId>/processing/<sourceId>/report.pdf", "sha256": "9a3e…" },
  "fileName": "report.pdf",
  "declaredMimeType": "application/pdf",
  "output": { "bucket": "ayunis", "keyPrefix": "<orgId>/processing/<sourceId>/extraction/" },
  "options": { "maxPages": 1000, "ocr": "auto", "languageHints": ["de", "en"] }
}
```

- `idempotencyKey`: supplied by the backend, `v1:<sourceId>:<sha256 of the object bytes>`; 1 to 160 characters of `[A-Za-z0-9:_-]`. See §5.
- `owner`: used for bulk cancellation and release (§7.2). The service never interprets the ids otherwise.
- `input.sha256`: the hash the backend computed while streaming. The service verifies it while downloading and fails the job with `INPUT_HASH_MISMATCH` if it differs, so a job can never run on an object that was replaced after the key was computed.
- `output.keyPrefix`: everything the service writes goes under this prefix. The backend chooses it under the source's processing prefix so the existing purge of `<orgId>/processing/<sourceId>/` removes results and checkpoints too.
- `options.ocr`: `auto` (the §8 rule), `always`, `never`. `maxPages` defaults to the service limit (§11) and cannot exceed it. `languageHints` steer the dictionary used by the rule; default `["de", "en"]`.

Responses:

| Case | Status | Body |
| --- | --- | --- |
| New job created | `201` | Job status (§3.2), state `queued` |
| Key exists, same `input` and `output` | `200` | Existing job status, whatever its state (see §5 for `failed`) |
| Key exists, different `input` or `output` | `409 IDEMPOTENCY_CONFLICT` | Error |
| Body invalid, limits exceeded up front (`maxPages` above cap) | `400 INVALID_REQUEST` | Error |
| Redis or MinIO unreachable | `503 SERVICE_UNAVAILABLE` | Error; the backend retries the start |

The service does not fetch the object on start. The start call returns in milliseconds; everything else happens in the job.

### 3.2 Job status

`GET /v1/jobs/{jobId}`

```json
{
  "jobId": "01J…",
  "idempotencyKey": "v1:…",
  "state": "running",
  "phase": "extracting",
  "attempt": 1,
  "restarts": 0,
  "progress": { "pagesTotal": 312, "pagesDone": 140, "pagesOcr": 37, "pagesText": 103 },
  "result": null,
  "error": null,
  "createdAt": "2026-10-21T10:00:00Z",
  "startedAt": "2026-10-21T10:00:02Z",
  "updatedAt": "2026-10-21T10:03:40Z",
  "finishedAt": null
}
```

- `state`: `queued`, `running`, `succeeded`, `failed`, `cancelled`. Only the last three are terminal.
- `phase` (informational, only while running): `downloading`, `converting`, `counting`, `analyzing`, `extracting`, `finalizing`.
- `progress.pagesTotal` is `null` until the `counting` phase has finished. `pagesDone` counts pages whose text is checkpointed, by either method.
- `result` when `succeeded`: `{ "bucket", "key", "bytes", "sha256", "pageCount" }` where `key` is `<keyPrefix>result.json`.
- `error` when `failed`: `{ "code", "message", "retryable", "details" }` with codes from §10. `message` is safe to store in `processingError`; `details` may carry provider status codes and is for logs only.
- `404 JOB_NOT_FOUND` after the record has been released or has expired (§7.3).

`GET /v1/jobs/by-key/{idempotencyKey}` returns the same document and is what a BullMQ retry uses when it has lost the job id (§5).

### 3.3 Result

`GET /v1/jobs/{jobId}/result` returns `{ "bucket", "key", "bytes", "sha256", "pageCount" }` with `200` when `succeeded`, `409 JOB_NOT_FINISHED` otherwise. It never streams the result through the service; the backend reads the object from MinIO itself.

### 3.4 Cancel

`POST /v1/jobs/{jobId}/cancel` → `202` with the job status. Idempotent: cancelling a terminal job returns `200` with the unchanged status. Semantics in §7.1.

### 3.5 Release

`DELETE /v1/jobs/{jobId}` → `204`. Cancels if not terminal, deletes every object under the job's `output.keyPrefix` that the service wrote, and deletes the job record. Idempotent; unknown ids return `204`.

`POST /v1/jobs/release` with `{ "orgId": "uuid", "sourceIds": ["uuid", …] }` releases every job of those sources; with `sourceIds` omitted it releases every job of the org. Returns `{ "released": n, "cancelled": m }`. This is the call behind source deletion and org deletion (§7.2).

## 4. Result JSON schema

Written once, atomically, to `<keyPrefix>result.json` (write to `result.json.tmp-<attempt>` then copy to `result.json`, since MinIO has no rename; the pointer in the job record is what the backend trusts).

```json
{
  "schemaVersion": 1,
  "jobId": "01J…",
  "idempotencyKey": "v1:…",
  "document": {
    "fileName": "report.pdf",
    "declaredMimeType": "application/pdf",
    "detectedType": "pdf",
    "pageCount": 312,
    "converter": null,
    "ocrModel": "mistral-ocr-latest",
    "ruleVersion": "ocr-rule/1",
    "pagesOcr": 37,
    "pagesText": 270,
    "pagesBlank": 5,
    "warnings": [],
    "timings": { "downloadMs": 1200, "conversionMs": 0, "analysisMs": 9800, "ocrMs": 61000, "totalMs": 74500 }
  },
  "pages": [
    {
      "index": 0,
      "number": 1,
      "text": "Stadt Musterhausen\nBeschlussvorlage …",
      "method": "text",
      "ocrReason": null,
      "quality": {
        "charCount": 2310,
        "inkRatio": 0.061,
        "textInkCoverage": 0.97,
        "garbageRatio": 0.0,
        "wordValidity": 0.94,
        "tableLikelihood": 0.05
      },
      "size": { "width": 595.3, "height": 841.9 }
    }
  ]
}
```

Field rules:

- `pages` is complete and ordered by `index`; one entry per page, blank pages included with `text: ""` and `method: "blank"`. The backend keeps joining `pages[].text` with `\n` and chunking the whole document, as today.
- `index` is 0-based; `number` is 1-based and is what the backend stores as the page number (today `FileRetrieverPage.number`).
- `method`: `text` (text layer), `ocr`, `text_fallback` (rule said OCR but OCR is not configured or was switched off with `options.ocr: never`), `blank`.
- `ocrReason` is set when `method` is `ocr` or `text_fallback`: `no_text`, `low_coverage`, `garbage`, `invalid_words`, `table`, `forced`.
- `quality` is always present for PDF pages, so the rule can be re-evaluated offline from stored results. Values are the §8 signals. Pages produced by OCR still carry the signals measured on the text layer before OCR.
- `text` has NUL bytes removed (PostgreSQL rejects them; today done in `FileRetrieverPage`). Everything else is verbatim.
- `document.converter`: `null`, or `gotenberg-libreoffice` for Office input. `document.detectedType` is the service's own detection (magic bytes), which may differ from `declaredMimeType`.
- `document.warnings`: machine-readable strings, for example `ocr_not_configured`, `ocr_page_limit_truncated`, `text_order_uncertain`. The backend logs them; none changes status.
- Documents converted by Gotenberg or produced by the email path (AYC-1410) use the same schema; an email is one page.

Compatibility: `schemaVersion` increments on breaking changes only; adding optional fields does not bump it. The backend rejects a result with a `schemaVersion` it does not know as `PROCESSING_FAILED`.

## 5. Idempotency and BullMQ reconnection

The idempotency key is `v1:<sourceId>:<sha256>`. The source id makes the key unique per upload; the content hash protects against a stale key being used for a different object. The backend computes the hash while streaming the upload into MinIO, so no second pass over the file is needed.

Rules on `POST /v1/jobs` with an existing key:

| Existing state | Service does | Returns |
| --- | --- | --- |
| `queued`, `running` | Nothing | `200`, current status |
| `succeeded` | Nothing | `200`, status with `result` |
| `failed`, `error.retryable: true` | Re-queues the same job: `state: queued`, `attempt + 1`, checkpoints kept | `200`, status |
| `failed`, `error.retryable: false` | Nothing | `200`, failed status |
| `cancelled` | Nothing | `200`, cancelled status |

A second job is never created for a key that exists. Checkpointed pages (§6) are reused on re-queue, so a retry after a provider outage pays OCR only for pages not yet done.

How the three BullMQ attempts map onto this:

1. Attempt 1: the consumer calls `POST /v1/jobs`, stores the returned `jobId` in the BullMQ job data (`job.updateData`), and polls `GET /v1/jobs/{jobId}` every `POLL_INTERVAL` (5 s provisional). On each poll it refreshes the source heartbeat (`refreshProcessingHeartbeat`), so the 15-minute stale sweep now means "the backend has not looked at this source for 15 minutes", not "extraction took longer than 15 minutes". If the heartbeat refresh reports the source is gone, the consumer releases the job and exits (§7).
2. The attempt ends when the job is terminal. `succeeded`: download `result.json`, chunk, index, `READY`, purge the processing prefix. `failed`: classify per §10 and let `classifyJobFailure` decide between retry and settle. `cancelled`: exit without touching the source.
3. Attempt 2 and 3 (after the 5 s and 10 s exponential backoff): the consumer calls `POST /v1/jobs` again with the same body. By the table above this reconnects to the running job, picks up a finished result, or re-queues a retryable failure. If the consumer process died mid-poll (BullMQ `stalled`), the same path reconnects via `GET /v1/jobs/by-key/{key}` when the job data has no `jobId` yet.
4. The backend's own transient errors (service unreachable, `503` on start) are thrown as today; `classifyJobFailure` retries them. Nothing on the service is started until a start call succeeds, so no OCR is spent on those.

What the service must guarantee for this to hold: start is atomic per key (Redis `SET NX` on `extraction:key:<key>` pointing at the job id, then the job record), and a re-queue of a `failed` job is a compare-and-set on `state`, so two concurrent retries cannot both re-queue.

## 6. Restart recovery

Work distribution: each replica runs `MAX_CONCURRENT_JOBS` workers. A worker claims a job by moving it from the `extraction:queue` list into `running` with a lease key `extraction:lease:<jobId>` (TTL `LEASE_TTL`, 60 s provisional) that it renews every 20 s while working. The lease carries the replica id and PID.

Checkpoints: the service writes `<keyPrefix>pages/<index, 5 digits>.json` (one page entry in the §4 shape) as each page or OCR batch completes, and keeps `progress` in the job record in step. A page object is written exactly once; a rewrite is a no-op by content.

Recovery: a janitor loop on every replica (every 30 s, leader-free; a stale lease can only be reclaimed by one `SET NX`) scans for `running` jobs with an expired lease. For each:

- `restarts < MAX_RESTARTS` (2 provisional): increment `restarts`, re-queue the job. The next worker lists `pages/` under the prefix, treats those indices as done, and continues from the first missing index. Conversion output (`converted.pdf` under the prefix) is also reused if present and its recorded hash matches.
- `restarts == MAX_RESTARTS`: fail the job with `RESTART_LIMIT` (`retryable: false`). The backend settles the source as `PROCESSING_FAILED`.

Maximum cost of one restart: the work between two checkpoints. For text-layer pages that is one page of CPU. For OCR that is one OCR batch, bounded by `OCR_BATCH_PAGES` (20 provisional) pages of OCR charges and one Mistral round trip. An in-flight Gotenberg conversion is also lost; it is unbilled CPU time bounded by the conversion timeout.

Boot: a replica wipes its own scratch directory on start. Nothing in process memory is needed to resume, which is what "stateless" means here.

## 7. Cancellation, release and cleanup

### 7.1 Cancel semantics

`cancel` on a `queued` job removes it from the queue and sets `cancelled`. On a `running` job it sets `cancelled` with a compare-and-set; the worker checks the state between pages and between OCR batches and before every write. An in-flight HTTP call to Gotenberg or Mistral is aborted (client-side cancel); a response that still arrives is discarded.

No result is written after cancellation. The write path is: write `result.json`, then compare-and-set `running → succeeded`. If the compare-and-set fails because the state is `cancelled`, the worker deletes `result.json` itself. The cancel handler also deletes the prefix after setting the state. Both sides deleting is harmless; the invariant is that a job whose status says `cancelled` never has a `result` pointer, and the backend never reads a result object without a pointer.

Mistral uploads in flight are deleted best-effort, as today.

### 7.2 Who cancels when

| Trigger | Backend today | Backend with the service |
| --- | --- | --- |
| Source deleted while `PROCESSING` | `CleanupSourceProcessingUseCase`: remove waiting BullMQ job, purge `<orgId>/processing/<sourceId>/` | Same, plus `POST /v1/jobs/release { orgId, sourceIds }` before the purge. Active BullMQ jobs are not removed; the consumer's next poll sees `cancelled` (or the heartbeat refresh reports the source gone) and exits without writing. |
| Org deletion requested | `OrgProcessingDeletionListener` refuses while a job is active, then purges jobs in deferred cleanup | Listener first calls `POST /v1/jobs/release { orgId }` (cheap, idempotent), then applies the existing active-job check. Active consumers exit within one poll interval, so a retry of the deletion request succeeds. Whether the listener waits up to one poll interval instead of refusing is AYC-1408's call; the contract only requires that release is called before the check. |
| Backend gives up (final attempt failed, or stale sweep marked `FAILED`) | Purge prefix | Purge prefix and `DELETE /v1/jobs/{jobId}` (or release by owner when the id is unknown). |
| Result consumed, source `READY` | Delete the input object | Purge the whole processing prefix (input, checkpoints, result) and `DELETE /v1/jobs/{jobId}`. |

The consumer's existing guards stay: it re-checks `status === PROCESSING` before writing content and uses the conditional update to `READY`, so a source deleted between the last poll and the write is still never resurrected.

### 7.3 Cleanup and orphan sweeping

Ownership of objects:

| Object | Written by | Deleted by | When |
| --- | --- | --- | --- |
| Input `<orgId>/processing/<sourceId>/<file>` | Backend | Backend | Prefix purge on `READY`, `FAILED`, source or org deletion |
| `…/extraction/converted.pdf`, `…/extraction/pages/*.json`, `…/extraction/result.json` | Service | Backend via prefix purge; service on `cancel` and `release` | Same events |
| Job record and key index in Redis | Service | Service | `DELETE`/release immediately; otherwise TTL `RECORD_TTL` (24 h provisional) after the terminal timestamp |
| Service scratch files | Service | Service | On terminal state and on boot |

Orphans arise when the backend stops talking to a job without releasing it: a backend crash between result consumption and purge, a stale sweep that marked the source `FAILED` while the service kept working, or a service that finished after the backend's final attempt. Two sweeps cover them:

- Service janitor: a `running` or `queued` job whose record has not been polled (`lastPolledAt`) for `ORPHAN_AFTER` (1 h provisional) is cancelled and released, since the backend has clearly given up; a `succeeded` or `failed` record expires by TTL and its objects are deleted when the record expires (the janitor deletes the prefix contents it wrote before letting the key go).
- Backend sweep (extension of `StaleProcessingCleanupTask`, daily): list `*/processing/*/` prefixes older than 24 h, purge those whose source id no longer exists or is not `PROCESSING`, and call release by owner for each. This also catches input objects orphaned today.

Nothing in these sweeps touches a source row; they only remove objects and job records.

## 8. Per-page OCR decision rule

"The page has a text layer" is not the rule. Municipal PDFs often carry a text layer that is wrong (copier OCR with mis-recognised umlauts), partial (a stamped header over a scanned body), or unusable for retrieval (tables flattened into one line). The rule measures the text layer against the rendered page.

### 8.1 Signals, per page, from pypdfium2

All signals come from one low-resolution grayscale render (`page.render(scale=…)` at about 50 dpi) and the page's text page (`page.get_textpage()`), so measuring costs milliseconds per page and no OCR.

| Signal | Definition | Source |
| --- | --- | --- |
| `charCount` | Characters in the text layer after collapsing whitespace | `textpage.get_text_range()` |
| `inkRatio` | Fraction of rendered pixels darker than a threshold (non-white) | Render |
| `textInkCoverage` | Fraction of ink pixels that lie inside the union of text rectangles (`textpage.count_rects()` / `get_rect(i)`, padded by 2 pt) | Render and text page |
| `garbageRatio` | Fraction of characters that are U+FFFD, control characters, private-use, or outside the scripts expected from `languageHints` (Latin incl. umlauts, digits, punctuation, common symbols) | Text page |
| `wordValidity` | Fraction of alphabetic tokens of three or more letters found in the word lists for `languageHints`, after case folding; evaluated only when the page has at least 30 such tokens | Text page and word lists |
| `tableLikelihood` | Score in [0, 1] from two cheap cues: the fraction of text lines whose rectangles contain three or more horizontal gaps wider than 2 em, and the count of long horizontal and vertical rulings in the render (run-length scan) | Render and text page |

Word lists: the hunspell `de_DE` and `en_US` lists loaded as plain sets (data files, not linked code; the service's dependency review in AYC-1409 confirms the licence terms). German compounds lower `wordValidity` even on clean text, which is why the threshold is calibrated on the corpus rather than set a priori; if calibration shows the dictionary signal is too noisy, the fallback is a character-trigram plausibility score trained on the born-digital corpus documents, which needs no external data.

### 8.2 Decision

Evaluated in order; the first match decides. Thresholds are the starting point for §9 and ship as configuration with the values validation settles on.

| # | Condition | Decision | `ocrReason` |
| --- | --- | --- | --- |
| 1 | `options.ocr == always` | OCR | `forced` |
| 2 | `inkRatio < 0.002` and `charCount < 5` | `blank`, text `""` | — |
| 3 | `charCount < 20` and `inkRatio ≥ 0.01` | OCR | `no_text` |
| 4 | `textInkCoverage < 0.6` | OCR | `low_coverage` |
| 5 | `garbageRatio > 0.05` | OCR | `garbage` |
| 6 | `wordValidity < 0.7` (when evaluated) | OCR | `invalid_words` |
| 7 | `tableLikelihood ≥ 0.5` and `TABLE_PAGES_TO_OCR` is on | OCR | `table` |
| 8 | otherwise | text layer | — |

Notes:

- Rule 4 is what catches the partial text layer and image-heavy pages. Mistral OCR also transcribes figures (the backend collects image annotations today), so sending those pages is not waste.
- Rule 7 is a cost switch. Text-layer extraction of tables yields cell text in content-stream order; Mistral returns markdown tables, which chunk and retrieve far better. Validation (§9) reports the OCR share with the switch on and off; the default is on unless the measured cost is disproportionate.
- With `options.ocr == never`, or when OCR is not configured, a page the rule routes to OCR is emitted from its text layer as `text_fallback` with the reason kept. If every page is blank or `text_fallback` with empty text, the job fails with `EMPTY_DOCUMENT`. This preserves today's behaviour of local parsing when no Mistral key is configured.
- OCR is dispatched in batches: pages marked for OCR are grouped in document order into sub-PDFs of at most `OCR_BATCH_PAGES` pages and at most `OCR_BATCH_BYTES` (pypdfium2 `PdfDocument.new()` plus `import_pages`), one Mistral call per batch, three transient retries per batch as today. Page indices are mapped back from the batch response. This removes Mistral's whole-document page cap from the path and bounds the restart cost (§6).
- Document-level shortcut: when the rule marks more than 90 % of pages for OCR, the remaining pages are OCR'd as well, so the result does not alternate methods page by page inside one scanned document.

### 8.3 Rule versioning

`document.ruleVersion` names the rule and threshold set used. Changing a threshold bumps the version; stored results stay interpretable because `quality` is kept per page.

## 9. Validation corpus

### 9.1 What it is

A set of representative municipal documents with recorded expected outcomes, used to calibrate the §8 thresholds and to measure OCR savings before AYC-1409 ships. It is part of this ticket's deliverable and the acceptance gate for the rule.

### 9.2 Where it lives

Outside the repository, in a private MinIO bucket `ayunis-extraction-corpus` on the internal environment (the same infrastructure AYC-1411 deploys to; access through the existing MinIO console credentials for operators). Layout:

```text
ayunis-extraction-corpus/
  README.md                 # provenance rules, how to add a document, how to run the harness
  manifest.yaml             # one entry per document, see below
  born-digital/…
  scan-no-text/…
  scan-copier-ocr/…
  tables/…
  mixed/…
  forms/…
  office/…
  large/…
```

Documents must be public municipal documents (council information systems, Amtsblätter, published Satzungen and Bescheid templates) or internal documents with written consent and no personal data. Provenance (URL or consent reference) is recorded per entry. Nothing from a customer tenant is copied into the corpus.

`manifest.yaml` entry:

```yaml
- file: scan-copier-ocr/ratsprotokoll-2019-03.pdf
  category: scan-copier-ocr
  source: https://ris.example-stadt.de/...
  pages: 14
  expected:
    ocrPages: all          # all | none | [0, 3, 7]
    textPages: none
    mustContain:
      - "Beschlussvorlage"
      - "einstimmig angenommen"
    tables: [5, 6]        # pages with tables that must come out row by row
```

### 9.3 Categories and expected outcomes

| Category | Minimum count | What it tests | Expected rule outcome |
| --- | --- | --- | --- |
| Born-digital letters, Bescheide, Beschlussvorlagen (Word to PDF) | 15 | Clean text layers | ≤ 5 % of pages OCR'd; `mustContain` found |
| Born-digital with letterhead graphics and signatures | 5 | Rule 4 does not over-trigger on logos | ≤ 10 % OCR'd |
| Scans without text layer | 10 | Rule 3 | 100 % OCR'd |
| Scans with copier OCR layer (several device vendors) | 10 | Rules 5 and 6 | ≥ 95 % of pages OCR'd when the layer is bad; a good copier layer may pass, and `mustContain` must then still be found |
| Tables: Satzungen with fee tables, budget pages, Sitzungskalender | 8 | Rule 7 and table quality | With the switch on, 100 % of table pages OCR'd and rows intact in the result; with it off, record the cost difference |
| Mixed: born-digital body with scanned attachments | 8 | Per-page decision | Attachment pages OCR'd, body pages not; both appear in order |
| Forms (filled and blank) | 5 | Blank detection, low text | Blank forms detected as `blank` or OCR'd, never `text` with empty content |
| Office input (DOCX, PPTX, ODT) | 6 | Conversion then rule | Converted pages behave like born-digital |
| Large: 300 to 1500 pages | 3 | Batching, progress, restart cost | Completes; progress monotonic; one forced restart re-does at most one batch |

Acceptance for the rule: on the whole corpus, recall for "this page needs OCR" ≥ 0.98 (a page that needed OCR and went through the text layer is the expensive error, because the content is lost for retrieval), and precision such that born-digital categories stay at or under their OCR share above. The measured OCR share per category, with rule 7 on and off, is recorded in the corpus README with the rule version.

### 9.4 Harness

`scripts/validate_corpus.py` in the service package (built in AYC-1409) runs the §8 signals and decision on every manifest entry in dry-run mode (no Mistral calls), writes `decisions-<ruleVersion>.csv` with per-page signals and decisions next to the manifest, compares against `expected`, and prints the OCR share per category and the estimated cost at the provider's current per-page list price. A second mode runs the real pipeline on a chosen subset to check `mustContain` and table rows. The results table and the chosen thresholds are pasted back into this document's §8.2 and into the corpus README when the harness exists.

## 10. Failure codes

### 10.1 Service error codes

| Code | Retryable | Meaning |
| --- | --- | --- |
| `INVALID_REQUEST` | no | Body or options invalid (start only) |
| `IDEMPOTENCY_CONFLICT` | no | Key exists with different input or output (start only) |
| `JOB_NOT_FOUND` | no | Unknown or expired job |
| `JOB_NOT_FINISHED` | no | Result requested before `succeeded` |
| `INPUT_NOT_FOUND` | no | Object missing at `input.key` |
| `INPUT_HASH_MISMATCH` | no | Object bytes do not match `input.sha256` |
| `INPUT_TOO_LARGE` | no | Object exceeds `MAX_INPUT_BYTES` |
| `UNSUPPORTED_TYPE` | no | Service does not handle this type |
| `UNPROCESSABLE_DOCUMENT` | no | Corrupt, encrypted without password, or rejected by converter or OCR as a document |
| `TOO_MANY_PAGES` | no | Page count above `options.maxPages`; `details.pageCount`, `details.maxPages` |
| `EMPTY_DOCUMENT` | no | Every page blank or empty after extraction |
| `CONVERSION_UNAVAILABLE` | yes | Gotenberg `503` or unreachable |
| `CONVERSION_FAILED` | yes | Gotenberg timeout or unexpected status |
| `OCR_UNAVAILABLE` | yes | Mistral `5xx`, connection failures after retries; `details.reason: not_configured` is never a job failure (see `text_fallback`) |
| `OCR_TIMEOUT` | yes | Mistral call exceeded the per-call timeout after retries |
| `OCR_REJECTED` | no | Mistral `4xx` that is not a document error (not `401`/`403`) |
| `OCR_UNAUTHORIZED` | no | Mistral `401`/`403`: configuration fault, alert |
| `STORAGE_UNAVAILABLE` | yes | MinIO unreachable while reading input or writing output |
| `JOB_TIMEOUT` | yes | Wall-clock `MAX_JOB_SECONDS` exceeded |
| `RESTART_LIMIT` | no | Lease expired `MAX_RESTARTS` times (§6) |
| `CANCELLED` | no | Reported in `state`, not as an error |
| `INTERNAL` | no | Anything else; the service logs the traceback |

### 10.2 Mapping from today's errors

The user-visible contract is `SourceProcessingErrorCode`, which the frontend maps to copy in `source-processing-error.ts`. No value is added or removed, so the copy does not change.

| Today (backend error) | HTTP today | Service code | `SourceProcessingErrorCode` | Change in behaviour |
| --- | --- | --- | --- | --- |
| `TooManyPagesError` from preflight (`PreflightCheckUseCase`) | 422, synchronous at upload | `TOO_MANY_PAGES` | `DOCUMENT_PAGE_LIMIT_EXCEEDED` | The page count moves into the job (`counting` phase, seconds after start), because the API no longer holds the file in memory. The upload returns `201` and the source turns `FAILED` shortly after. Same code and copy; the timing change is for AYC-1412 to present. |
| `TooManyPagesError` from Mistral (`document_parser_too_many_pages`) | 422 in job | `TOO_MANY_PAGES` | `DOCUMENT_PAGE_LIMIT_EXCEEDED` | Can no longer happen for the whole document because OCR runs in batches; kept for the batch path. |
| `UnprocessableDocumentError` (Mistral 3310/3740/422, Gotenberg 400, pdf-parse malformed) | 422 | `UNPROCESSABLE_DOCUMENT` | `DOCUMENT_UNREADABLE` | Settles immediately, no retries, as today. |
| `EmptyOcrResultError`, `EmptyFileDataError` | 422 / 400 | `EMPTY_DOCUMENT` | `DOCUMENT_EMPTY` | Same. |
| `DocumentConversionUnavailableError` (Gotenberg 503) | 503 | `CONVERSION_UNAVAILABLE` | `PROCESSING_UNAVAILABLE` | Retried by BullMQ as today. |
| `FileRetrievalFailedError` (Gotenberg timeout, unreachable, other status) | 500 | `CONVERSION_FAILED` | `PROCESSING_FAILED` | Same classification; alerts as today. |
| `FileRetrieverProviderNotAvailableError` (no Mistral key, local parsing disallowed) | 500 | none; pages become `text_fallback` | — | The service always has a text-layer path, so the error disappears; an all-empty result is `EMPTY_DOCUMENT`. |
| `ProviderUnavailableError` (Mistral 5xx, network) | 503 | `OCR_UNAVAILABLE` | `PROCESSING_UNAVAILABLE` | Same. |
| `ProviderTimeoutError` | 504 | `OCR_TIMEOUT` | `PROCESSING_TIMEOUT` | Same. |
| `ProviderRequestRejectedError` (other Mistral 4xx) | 500 class | `OCR_REJECTED` | `PROCESSING_FAILED` | Not retried (deterministic), alerts once, as today. |
| Mistral 401/403 (today `FileRetrieverUnexpectedError`) | 500 | `OCR_UNAUTHORIZED` | `PROCESSING_FAILED` | Distinct code so the configuration incident is recognisable; copy unchanged. |
| `FileTooLargeError` (Gotenberg 413) | 413 | `INPUT_TOO_LARGE` | `PROCESSING_FAILED` | Unchanged mapping (the classifier has no size code today). A dedicated `DOCUMENT_TOO_LARGE` code with copy belongs to AYC-1412 if the per-tier limits need it. |
| `InvalidFileTypeError` | 400 | `UNSUPPORTED_TYPE` | `PROCESSING_FAILED` | Unreachable in normal operation: the backend validates type at upload. |
| `FileRetrieverUnexpectedError`, anything unclassified | 500 | `INTERNAL` | `PROCESSING_FAILED` | Same. |
| `StorageUnavailableError` | 503 | `STORAGE_UNAVAILABLE` | `PROCESSING_UNAVAILABLE` | Same. |
| Stale sweep (`processingStartedAt` older than 15 min) | — | — | `PROCESSING_TIMEOUT` | Heartbeat is refreshed on every poll, so this now only fires when the backend stopped polling. |
| — (new) | — | `JOB_TIMEOUT` | `PROCESSING_TIMEOUT` | Service-side wall clock. |
| — (new) | — | `RESTART_LIMIT`, `INPUT_HASH_MISMATCH`, `INPUT_NOT_FOUND` | `PROCESSING_FAILED` | Infrastructure faults, alert. |
| — (new) | — | `CANCELLED` | none | Consumer exits; source row untouched. |

Backend mapping lives in one place (the new extraction port's error adapter), so `classifySourceProcessingError` keeps its current shape: it receives `ApplicationError` subclasses with the same codes and status classes as today. `retryable` from the service decides `statusCode` 5xx vs 4xx on the adapter side, which is what `classifyJobFailure` reads.

## 11. Limits

Provisional defaults; every value is an environment variable of the service and documented in its README. Values marked "verify" are not confirmed against the provider's current documentation (the Mistral OCR docs fetched on 2026-10-21 do not state numeric limits) and must be checked in AYC-1409 before being baked in.

| Limit | Env | Default | Why |
| --- | --- | --- | --- |
| Max input object size | `MAX_INPUT_BYTES` | 500 MB | Scratch disk and conversion time; the product limit per tier (AYC-1412) is set at or below this |
| Max pages per job | `MAX_PAGES` | 1000 | Matches today's `PROCESSING_MAX_PDF_PAGES`; no longer a provider wall since OCR is batched, so it becomes a cost decision for AYC-1412 |
| OCR batch size | `OCR_BATCH_PAGES`, `OCR_BATCH_BYTES` | 20 pages, 20 MB (verify against the provider's per-request limits) | Bounds restart cost and keeps each call well inside the per-call timeout |
| Mistral per-call timeout | `OCR_CALL_TIMEOUT_SECONDS` | 120 s | Same reasoning as today's `TIMEOUT_MS` in the Mistral handler |
| Gotenberg timeout | `CONVERSION_TIMEOUT_SECONDS` | 600 s | Matches today's converter and compose `API_TIMEOUT: 10m` |
| Job wall clock | `MAX_JOB_SECONDS` | 7200 s | 1000 OCR pages in 50 batches at the observed p95 fit comfortably; a longer job indicates a stuck dependency |
| Concurrent jobs per replica | `MAX_CONCURRENT_JOBS` | 4 | Rendering is CPU-bound but cheap at 50 dpi; OCR and conversion are I/O-bound; two CPUs per replica in compose |
| Lease TTL and renewal | `LEASE_TTL_SECONDS` | 60 s, renewed every 20 s | Three missed renewals before another replica takes over |
| Restarts per job | `MAX_RESTARTS` | 2 | Three starts in total |
| Orphan cutoff | `ORPHAN_AFTER_SECONDS` | 3600 s | Backend polls every 5 s; an hour of silence means it is gone |
| Record retention | `RECORD_TTL_SECONDS` | 86400 s | Long enough for the backend's three attempts and for operators to inspect a failure |
| Scratch disk per replica | compose volume | 2 × `MAX_INPUT_BYTES` × `MAX_CONCURRENT_JOBS` | Input plus converted PDF plus batch sub-PDFs |
| Memory | compose limit | 2 GB per replica (verify with the large-document corpus category) | Input is streamed to disk; pypdfium2 loads pages lazily; one 50 dpi render at a time per job |

Backend-side constants that change with this contract: `POLL_INTERVAL` 5 s, the stale timeout stays 15 minutes but now measures polling silence, and the `document-processing` consumer concurrency can rise above 2 because the worker no longer holds buffers or runs OCR. Multer's 25 MB limit is replaced by the per-tier limit from AYC-1412 and disk-streamed uploads from AYC-1408.

## 12. End-to-end sequence (reference for AYC-1408 and AYC-1409)

1. Upload: Multer stores to disk; the backend streams the file into MinIO at `<orgId>/processing/<sourceId>/<file>` while computing SHA-256; creates the `PROCESSING` source; enqueues the BullMQ job with `sourceId`, `orgId`, `userId`, `minioPath`, `sha256`, `fileName`, `fileType`.
2. Consumer attempt: admits the org, loads the source, refreshes the heartbeat, calls `POST /v1/jobs` (§3.1), stores `jobId` on the BullMQ job.
3. Service: claims the job, downloads the input to scratch while verifying the hash, converts if Office, counts pages (fails `TOO_MANY_PAGES` here), runs the §8 signals and decision for every page, extracts text-layer pages and checkpoints them, builds OCR batches and checkpoints each batch result, writes `result.json`, compare-and-sets `succeeded`.
4. Consumer: polls every 5 s, refreshing the heartbeat and checking the source still exists; on `succeeded` downloads `result.json`, joins pages, chunks, indexes, conditional update to `READY`, purges the prefix, releases the job.
5. Failure: `failed` maps per §10; `classifyJobFailure` retries or settles; on settle the consumer marks `FAILED`, cleans the index, purges the prefix, releases the job.
6. Deletion at any point: release by owner, then the existing purge; the consumer exits on `cancelled` or a lost heartbeat.

## 13. Decisions recorded here

- Backend polls; the service never calls the backend. A callback would need backend-side auth and reachability from the service and buys nothing while the consumer holds the BullMQ job anyway.
- Job state in Redis, payload in MinIO. MinIO alone cannot give atomic claims; Postgres would couple the service to the backend's schema.
- The result lives under the source's processing prefix so one purge path covers everything, instead of a second bucket with its own lifecycle.
- Page-level checkpoints, not "restart once": the difference is the OCR bill on a 1000-page scan.
- Preflight page counting moves into the job. Keeping it synchronous would require parsing a large file in the API process, which is the constraint this work removes.
- Table pages default to OCR pending the §9 cost measurement.
- Audio and spreadsheets stay in the backend.

## 14. Open points for the reviewers

1. Threshold values in §8.2 are starting points; sign-off is on the signals and the acceptance criteria in §9.3, with the values settled by the harness.
2. Whether `OrgProcessingDeletionListener` should wait one poll interval after release instead of refusing with `OrgProcessingActiveError` (§7.2). Either satisfies the contract.
3. Whether a `DOCUMENT_TOO_LARGE` processing error code and copy should be added in AYC-1412 or the size limit stays a synchronous upload rejection only.
4. Corpus hosting: the internal-environment MinIO bucket is the proposal; a shared drive is acceptable if operators prefer, as long as the manifest format stays.
