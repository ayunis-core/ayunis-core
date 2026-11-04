# PDF ingestion batching

Uploaded originals use the direct-upload flow in AYC-1541 (parent PR #2148).
Processing stays in the existing document consumer. AYC-1546 later moves the same
code into a separate worker. Public upload and page limits stay unchanged.

| Setting               | Default  | Meaning                              |
| --------------------- | -------- | ------------------------------------ |
| `OCR_BATCH_MAX_PAGES` | 20       | Pages per independently readable PDF |
| `OCR_BATCH_MAX_BYTES` | 10485760 | Encoded PDF request bytes            |
| `OCR_MAX_CONCURRENCY` | 4        | Concurrent OCR requests per process  |

One batch per document runs at a time. Completed results are saved under
`<orgId>/processing/<sourceId>/results/<identity>.json`. The identity includes the
input and batch boundaries. Converted Office files use the original upload identity.
Retryable failures retain results; success, terminal failure, settled-job skips
and source deletion clean them. Cleanup is best effort if storage is unavailable.
Originals remain until no source references them. Final text writes use an existing
guarded update, never a source upsert.

## Validation contract

High-Risk: provider requests, background concurrency and deletion races.

| Failure mode                  | Ownership path                       | Observable check                     |
| ----------------------------- | ------------------------------------ | ------------------------------------ |
| Wrong stored size or owner    | API → MinIO verification             | Reject before processing             |
| Oversized OCR request         | Retriever → PDF splitter → OCR       | Valid PDF within both caps           |
| Retry or process restart      | Consumer → checkpoint → OCR          | Reuse completed batches              |
| Deleted or failed source      | Consumer → source → checkpoint/index | Stop work; no resurrection           |
| Page order or lost image text | Retriever → existing OCR             | Preserve baseline facts and ordering |

The full capped input and parsed PDF still occupy memory. This does not establish
500 MB support. Provider concurrency limits are per process; divide account budgets
between replicas before scaling. A provider success followed by a failed checkpoint
write is unconfirmed and can be sent again.

Scale notes: inputs remain capped at 25 MiB and PDFs at 1,000 pages by default.
Each cold OCR batch uses four source primary-key reads plus organization lifecycle
checks. No database transaction spans a provider call. Checkpoint writes are
repeatable; provider delivery remains at least once.

Validation includes real MinIO/Redis/PostgreSQL uploads and queue retries, module
wiring, oversized pages and a real Mistral mixed native/scanned PDF compared with
the unsplit baseline. Broader real-document and peak-load checks remain required
before raising public limits.
