# Knowledge Base Sync Module

Keeps a knowledge base location in sync with an external system: a user adds a URL (for SharePoint a site, a document library or a folder), and every file below it becomes a regular knowledge base document. Provider-neutral: connectors (`domain/connectors`) list the files and read their content; this module decides what that means for the documents. Nothing here knows a product.

Everything here is behind the `connectorsEnabled` feature flag (`FEATURE_CONNECTORS_ENABLED`, off by default), except removing a location. With the flag off, synced documents stay searchable as normal documents.

## Domain

- **`SyncedLocation`** — `id`, `orgId`, `knowledgeBaseId`, `connectorId`, `location` (the URL the user added), `cursor` (the connector's opaque position, `null` before the first sync), `state` (`active` | `no_longer_accessible`), `lastSyncedAt`. Unique per knowledge base, connector and URL.
- **`SyncedFile`** — `locationId`, `externalId` (the provider's item ID, stable across renames and moves), `name`, `path` (below the location), `version` (the latest listed), `size`, `state`, `skipReason`, `sourceId`, `lastSourceId` (the document it was last imported as, kept after a user removes it), `documentVersion` (the version the document was last processed at, successfully or not; `null` until then) and `processingErrorCode` (why processing `documentVersion` failed, with the processing error codes of documents; `null` when it succeeded). A file whose document is behind its version needs processing. One document (source) per imported file, so citations name the real file and each file has its own processing status.
  - `imported` — has a document, unless a user removed it (`sourceId` is then `null`).
  - `skipped` + `skipReason` (`unsupported_type`, `too_large`, `encrypted`) — not a failure, no document, not counted toward the limit, not tried again until its version changes. `removed_after_failure`: a user removed its failed document; likewise not imported again until its version changes.
  - `awaiting_capacity` — waits for room in the knowledge base.

## Reconciliation (`SyncReconciler`)

The connector's listing is matched with the location's files by item ID:

- **New file** — gets a PROCESSING document if the knowledge base has room. Synced files share the knowledge base's limit of 500 documents with uploads and URLs (`KnowledgeBasesConstants.MAX_SOURCES`); files beyond it stay `awaiting_capacity` and get room on a later sync, first by path.
- **Renamed or moved** (same version) — only the file's name and path and the document's name change; nothing is re-processed.
- **Changed** (new version) — the document stays as it is until the new version is processed (see Processing).
- **Deleted**, or missing from a full listing — the file and its document with its index entries are removed. Deletions of unknown IDs are ignored (providers report deletions by ID only, also for items the app never saw).
- **Unprocessable** — the connector's reason (e.g. encrypted), else the upload checks of the sources module (`CheckSourceFileAcceptanceUseCase`: the types and size limits of knowledge base uploads). A new version that cannot be processed removes the old document; a file still waiting for a document is skipped as soon as it is reported unprocessable, also without a new version.
- **Document removed by a user** — the file is imported again on the next sync, within the limit, unless the document had failed at the file's current version: `FailedSourcesDeletedListener` skips it as `removed_after_failure` in the removal's transaction (the sources module emits `FailedSourcesDeletedEvent` for a single removal and for "Remove all failed"), so it is imported again only once its version changes. A newer version still to be processed is imported again as usual.

A full listing (`fullListing`, e.g. after Graph's `410 resyncRequired`) reaches the same end state as incremental syncs.

## Use Cases

- **`AddSyncedLocationUseCase`** — Adds a location to a knowledge base the current user may change (`AssertKnowledgeBaseWriteAccessUseCase`), through the organization's set-up connector for the product (`FindSetUpConnectorUseCase`). `SYNCED_LOCATION_ALREADY_EXISTS` (409) for a duplicate, `KNOWLEDGE_BASE_SYNC_DISABLED` (404) with the flag off. Lists nothing yet.
- **`SyncLocationUseCase`** — One sync run, without a user (scheduling and "Sync now" are AYC-1885). Asks the connectors module for the changes since the cursor (`ListConnectorChangesUseCase`):
  - `access_lost` — the location becomes `no_longer_accessible`, unless a newer sync was recorded meanwhile; its documents stay searchable. The next successful sync makes it `active` again.
  - `throttled` — returned with `retryAt`; nothing changes.
  - `changes` — `SyncPlanApplier` applies them in one transaction: it locks the location through `SyncedLocationLocks`, removes and renames documents, creates documents within the limit (`AddSyncedDocumentsToKnowledgeBaseUseCase`, under the knowledge base's row lock), writes the files and stores the cursor and `lastSyncedAt`. An interrupted sync repeats from the old cursor. The listing is made before the lock; if another sync recorded itself meanwhile (`lastSyncedAt` changed), it is outdated and nothing is applied (`superseded`). After the commit, every file that needs processing is queued, on every sync: the queue keeps one job per document version, so this recovers jobs that a failed or interrupted enqueue lost.
  - Returns a summary: `added`, `removed`, `relabelled`, `contentChanged`, `skipped` and `notSyncedLimitReached` (the location's "X files not synced, limit reached").
  - `disabled` with the flag off.
- **`RemoveSyncedLocationUseCase`** — With write access to the knowledge base: removes the location, its files and their documents with their index entries, in one transaction holding the location's locks (`SyncedLocationLocks`), so a running sync cannot add documents meanwhile; the waiting jobs of its files are removed after the commit. Available with the flag off.

## Locks (`SyncedLocationLocks`)

A sync and a removal lock in the order in which deletions take the same locks, so neither deadlocks with them: the organisation lifecycle lock and the knowledge base's row (`LockKnowledgeBaseUseCase`; deleting either locks it before the documents, the location and its files it cascades to), then the location, then the documents of its files (`LockSourcesUseCase`; deleting a document locks it before its file, `ON DELETE SET NULL`), then the files. `lockFile` takes the same locks for one file, its document and then a replacement about to take the document's place (deleting the document locks the replacement it cascades to after the document, `sources.replacesSourceId`).

## Processing

`SyncedFileJobsPort` (`SyncedFileJobsProducer`) puts one job per document and version on the `knowledge-base-sync` BullMQ queue (`{ orgId, knowledgeBaseId, locationId, syncedFileId, sourceId, version }`), under the organisation lifecycle lock like the other ingestion producers. A version queued twice is one job while BullMQ keeps it; completed and failed jobs are removed at once, so a job that ended without processing its version (access lost, connectors off, or failed without settling it, e.g. after its worker died too often) does not keep a later sync from queueing it again. A file imported again after its document was removed gets a new job.

`SyncedFileProcessingConsumer` (registered in `IngestionConsumersModule`, so it runs in the API or the ingestion worker; concurrency `INGESTION_SYNC_CONCURRENCY`, default 1) works through the queue without a user, so uploads never wait behind a sync. Jobs are retried like uploads (three attempts, the document queue's retry spacing for a busy or slow converter). Per job:

1. **`StartSyncedFileProcessingUseCase`** — with connectors off, nothing (`disabled`). A job whose file, document or version moved on, or that was already processed, is `skipped`. Otherwise the content is read through `FetchConnectorItemContentUseCase`:
   - `access_lost` — the location becomes `no_longer_accessible` (unless a newer sync was recorded); its documents stay.
   - `throttled` — returned with `retryAt`; the consumer moves the job to delayed until then, without spending an attempt or failing anything. Pausing the location is AYC-1885.
   - `gone` — the file and its document are removed (`SyncedFileDocuments.remove`).
   - `content` — stored as the original (`<orgId>/synced/<sourceId>/<name>`, `UploadOrgObjectUseCase`) of a new **hidden replacement** of the file's document (`CreateReplacementSourceUseCase`): a PROCESSING source outside every knowledge base, so it is neither counted toward the limit, listed nor searched, and deleted with the document it replaces. Every job processes its own replacement (its ID derived from document and version), never the document, so two versions processed at once never write the same source; an older replacement of the document is dropped. A retry goes on with the replacement its earlier attempt stored, so the pipeline resumes from its saved results without reading the file again; a replacement the stale cleanup failed meanwhile (`PROCESSING_TIMEOUT`, a dead worker rather than the file) is not settled but read again, and the new replacement drops it. Every other failure of a replacement is settled as the version's failure.
2. **The document pipeline** of uploads (`DocumentProcessingPipeline`) processes the replacement.
3. **`CompleteSyncedFileProcessingUseCase`** — once the replacement is settled (`SyncedFileDocuments.settle`, under the locks of a sync on that one file): it takes the document's place in one transaction (`SwapInReplacementSourceUseCase`), so search finds the old version until then and only the new one after, and the document count stays the same. A failed replacement takes the place only of a document without an indexed version (a new file shows its failure); a document holding an indexed version keeps it. Either way the file records the version as processed (`documentVersion`) with its failure (`processingErrorCode`), so the version is not queued again. A replacement for a version that is no longer the file's is discarded. An indexed replacement that took the place is then checked against the org's current embedding model (`SourceReindexScheduler`, AYC-1919): while hidden it is reachable from no org, so re-indexing after a model change catches it only from there.
4. **`FailSyncedFileProcessingUseCase`** — when reading or storing the content fails on the last attempt, the version is recorded as processed with the classified error code; a document without a version shows the failure.

## Lifecycle

- `knowledge_base_synced_locations` cascades with its knowledge base, its connector and its organization; `knowledge_base_synced_files` with its location. Synced documents belong to the knowledge base (`sources.knowledgeBaseId`), so deleting the knowledge base, its owner or the organization removes them and their index entries as for every document, and their hidden replacements with them (`sources.replacesSourceId`, `ON DELETE CASCADE`).
- Queued processing: removing a location removes its files' waiting jobs; deleting the organization removes all of them (`OrgProcessingDeletionListener`, which also refuses while one runs). A job whose file is gone, e.g. after its knowledge base was deleted, ends without reading anything, and a running one stops once its replacement is gone.
- A file's `sourceId` is set to `null` when its document is deleted (`ON DELETE SET NULL`).
- The connector outlives a removed connection: its locations stay and report access lost until it is set up again.

## Infrastructure

- **`LocalSyncedLocationsRepository`** — TypeORM, tables `knowledge_base_synced_locations` and `knowledge_base_synced_files`. Files are written in batches with one `INSERT … ON CONFLICT (id) DO UPDATE` each and read under `FOR UPDATE` during a sync. Check constraints: `skipReason` is set exactly for skipped files, and only imported files have a document. `lastSourceId` has no foreign key, so it outlives the document.
- **`SyncedFileProcessingConsumer`** — the `knowledge-base-sync` queue's worker (see Processing); listed in queue inspection and telemetry.
