# Ingestion batching

Uploaded originals use the direct-upload flow in AYC-1541 (parent PR #2148).
PDF and recording processing still run in the existing document consumer. AYC-1546
will move this same code into a separate worker; public upload limits stay unchanged.

## Configuration

| Setting                           | Default             | Meaning                                          |
| --------------------------------- | ------------------- | ------------------------------------------------ |
| `OCR_BATCH_MAX_PAGES`             | 20                  | Maximum pages in each independently readable PDF |
| `OCR_BATCH_MAX_BYTES`             | 10485760            | Maximum encoded PDF request bytes                |
| `OCR_MAX_CONCURRENCY`             | 4                   | Concurrent OCR requests per application process  |
| `AUDIO_SEGMENT_MAX_SECONDS`       | 600                 | Maximum recording segment duration               |
| `AUDIO_SEGMENT_MAX_BYTES`         | 20971520            | Maximum encoded audio request bytes              |
| `AUDIO_TRANSCRIPTION_CONCURRENCY` | 2                   | Concurrent recording requests per process        |
| `AUDIO_TRANSCRIPTION_TIMEOUT_MS`  | 120000              | Recording transcription request timeout          |
| `AUDIO_MAX_DURATION_SECONDS`      | 10800               | Recording preparation duration cap               |
| `AUDIO_TEMP_DIRECTORY`            | `/tmp/ayunis-audio` | Private temporary audio workspace                |

The runtime image includes FFmpeg and ffprobe. Microphone transcription keeps its
existing endpoint, validation and single-request behavior. Uploaded recordings
retain original timestamps in searchable text. Text inside PDF figures continues
through the existing Mistral image-text annotation path.

Completed parts are stored under
`<orgId>/processing/<sourceId>/results/<identity>.json`. The identity includes the
input and part boundaries. Transcription also includes model and language. Shared
lifecycle checks reject inactive sources and remove late writes after deletion.
Retryable failures retain checkpoints; success, terminal failure, settled-job skips
and source deletion clean them. Cleanup is best effort when storage is unavailable.
Uploaded originals remain until no source references
them. Final content writes use an existing guarded update, never a source upsert.

## Validation contract

High-Risk: concurrency-sensitive processing, provider requests and source deletion.

| Failure mode                | Ownership path                           | Observable check                                                  |
| --------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| Duplicate upload completion | API → upload session → source → Redis    | Same source ID, one processing flow                               |
| Wrong stored size or owner  | API → MinIO verification → source        | Reject before processing; distinct-org access denied              |
| Oversized PDF request       | Retriever → PDF splitter → OCR           | Every batch is a valid PDF within page and byte caps              |
| Retry or process restart    | Consumer → checkpoint → provider         | Completed batches/parts are reused in order                       |
| Deleted or failed source    | Consumer → source row → checkpoint/index | No new provider work or source resurrection; results cleaned      |
| Audio boundaries            | FFmpeg → transcription → stored text     | Valid segments, offsets, malformed-file and cleanup checks        |
| Unsupported image-only text | PDF → existing image annotations         | Preserve baseline output; no selective OCR change                 |
| Resource pressure           | Consumer → preparation/provider/storage  | Current input limits, bounded parts and one output file at a time |

Since AYC-1729 PDFs and office documents are staged on disk and split by `qpdf`, so
memory per job is bounded by the batch size; before, the input was downloaded into
memory and `pdf-lib` held its parsed representation as well. Larger limits still need
the load test (AYC-1545).
Provider semaphores are per process. Account-wide budgets must be enforced or divided
between replicas before scaling the deployment. A provider success followed by a
checkpoint-write failure is unconfirmed and can be sent again on retry.

Scale notes: current inputs are capped at 25 MiB and PDFs at 1,000 pages by default;
lifecycle reads use the source primary key, with four source reads per cold OCR
batch plus existing organization lifecycle checks. No transaction spans provider
calls. Checkpoint writes are repeatable; provider delivery remains at least once.

Before raising limits, test real provider output, speech at segment boundaries,
peak load, full-process memory and temporary-disk use. Synthetic provider tests
verify integration and recovery, not OCR or speech-recognition quality.

## Local verification

Slot 55 exercised the real API, Redis, MinIO and PostgreSQL: signed single and
multipart uploads, abort, duplicate completion, stored-size verification, tenant
isolation, queue retry with saved-batch reuse, READY text and original deletion.

Real Mistral OCR preserved the baseline facts and page order in a mixed
native/scanned three-page PDF. Real Voxtral transcription of synthetic speech split
at six seconds matched all words from its unsplit baseline, including a sentence
crossing the cut. This small sample does not establish general transcription quality.

A local FFmpeg check split a 10,799-second compressed speech recording (21,598,425
bytes) into 18 segments, each at most 19,200,078 bytes, with continuous offsets and
no temporary files left. This checks long-file preparation only; it does not claim
full-length provider accuracy, production throughput or total subprocess memory.

Backend validation passed 7,220 unit tests and 163 PostgreSQL/Redis integration
tests. The separate existing Windows-1252 MSG test fails unchanged on the upload
parent branch on this host; it is excluded from the passing unit count.

Regression coverage also preserves a completed source and its index when another
delivery stops at a checkpoint. Real FFmpeg cases cover encoded recordings ending
at segment boundaries and a final part containing one sample. Configuration-backed
coverage verifies that a blank optional temporary directory uses the default.
