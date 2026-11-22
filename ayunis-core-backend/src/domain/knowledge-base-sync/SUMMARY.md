# Knowledge Base Sync Module

Keeps a knowledge base location in sync with an external system: a user adds a URL (for SharePoint a site, a document library or a folder), and every file below it becomes a regular knowledge base document. Provider-neutral: connectors (`domain/connectors`) list the files and read their content; this module decides what that means for the documents. Nothing here knows a product.

Everything here is behind the `connectorsEnabled` feature flag (`FEATURE_CONNECTORS_ENABLED`, off by default), except removing a location. With the flag off, synced documents stay searchable as normal documents.

## Domain

- **`SyncedLocation`** — `id`, `orgId`, `knowledgeBaseId`, `connectorId`, `location` (the URL the user added), `cursor` (the connector's opaque position, `null` before the first sync), `state` (`active` | `no_longer_accessible`), `lastSyncedAt`. Unique per knowledge base, connector and URL.
- **`SyncedFile`** — `locationId`, `externalId` (the provider's item ID, stable across renames and moves), `name`, `path` (below the location), `version` (the latest listed), `size`, `state`, `skipReason`, `sourceId`, `documentVersion` (the version the document was last processed at, successfully or not; `null` until then, set by the processing in AYC-1950). A file whose document is behind its version needs processing. One document (source) per imported file, so citations name the real file and each file has its own processing status.
  - `imported` — has a document, unless a user removed it (`sourceId` is then `null`).
  - `skipped` + `skipReason` (`unsupported_type`, `too_large`, `encrypted`) — not a failure, no document, not counted toward the limit, not tried again until its version changes.
  - `awaiting_capacity` — waits for room in the knowledge base.

## Reconciliation (`SyncReconciler`)

The connector's listing is matched with the location's files by item ID:

- **New file** — gets a PROCESSING document if the knowledge base has room. Synced files share the knowledge base's limit of 500 documents with uploads and URLs (`KnowledgeBasesConstants.MAX_SOURCES`); files beyond it stay `awaiting_capacity` and get room on a later sync, first by path.
- **Renamed or moved** (same version) — only the file's name and path and the document's name change; nothing is re-processed.
- **Changed** (new version) — the document stays until a newer one replaces it; replacing it without a search gap is AYC-1950.
- **Deleted**, or missing from a full listing — the file and its document with its index entries are removed. Deletions of unknown IDs are ignored (providers report deletions by ID only, also for items the app never saw).
- **Unprocessable** — the connector's reason (e.g. encrypted), else the upload checks of the sources module (`CheckSourceFileAcceptanceUseCase`: the types and size limits of knowledge base uploads). A new version that cannot be processed removes the old document; a file still waiting for a document is skipped as soon as it is reported unprocessable, also without a new version.
- **Document removed by a user** — the file is imported again on the next sync, within the limit. (AYC-1950 keeps failed ones out until they change.)

A full listing (`fullListing`, e.g. after Graph's `410 resyncRequired`) reaches the same end state as incremental syncs.

## Use Cases

- **`AddSyncedLocationUseCase`** — Adds a location to a knowledge base the current user may change (`AssertKnowledgeBaseWriteAccessUseCase`), through the organization's set-up connector for the product (`FindSetUpConnectorUseCase`). `SYNCED_LOCATION_ALREADY_EXISTS` (409) for a duplicate, `KNOWLEDGE_BASE_SYNC_DISABLED` (404) with the flag off. Lists nothing yet.
- **`SyncLocationUseCase`** — One sync run, without a user (scheduling and "Sync now" are AYC-1885). Asks the connectors module for the changes since the cursor (`ListConnectorChangesUseCase`):
  - `access_lost` — the location becomes `no_longer_accessible`, unless a newer sync was recorded meanwhile; its documents stay searchable. The next successful sync makes it `active` again.
  - `throttled` — returned with `retryAt`; nothing changes.
  - `changes` — `SyncPlanApplier` applies them in one transaction: it locks the location through `SyncedLocationLocks`, removes and renames documents, creates documents within the limit (`AddSyncedDocumentsToKnowledgeBaseUseCase`, under the knowledge base's row lock), writes the files and stores the cursor and `lastSyncedAt`. An interrupted sync repeats from the old cursor. The listing is made before the lock; if another sync recorded itself meanwhile (`lastSyncedAt` changed), it is outdated and nothing is applied (`superseded`). After the commit, every file that needs processing is queued, on every sync: the queue keeps one job per document version, so this recovers jobs that a failed or interrupted enqueue lost.
  - Returns a summary: `added`, `removed`, `relabelled`, `contentChanged`, `skipped` and `notSyncedLimitReached` (the location's "X files not synced, limit reached").
  - `disabled` with the flag off.
- **`RemoveSyncedLocationUseCase`** — With write access to the knowledge base: removes the location, its files and their documents with their index entries, in one transaction holding the location's locks (`SyncedLocationLocks`), so a running sync cannot add documents meanwhile. Available with the flag off.

## Locks (`SyncedLocationLocks`)

A sync and a removal lock in the order in which deletions take the same locks, so neither deadlocks with them: the organisation lifecycle lock and the knowledge base's row (`LockKnowledgeBaseUseCase`; deleting either locks it before the documents, the location and its files it cascades to), then the location, then the documents of its files (`LockSourcesUseCase`; deleting a document locks it before its file, `ON DELETE SET NULL`), then the files.

## Processing queue

`SyncedFileJobsPort` (`SyncedFileJobsProducer`) puts one job per document and version on the `knowledge-base-sync` BullMQ queue (`{ orgId, knowledgeBaseId, locationId, syncedFileId, sourceId, version }`), under the organisation lifecycle lock like the other ingestion producers. A version queued twice is one job (while BullMQ keeps it); a file imported again after its document was removed gets a new one. The consumer (registered in `IngestionConsumersModule`), reading the content through `FetchConnectorItemContentUseCase`, is AYC-1950; it sets the file's `documentVersion` once it is done with a version, or every sync queues that version again. Until then the documents stay PROCESSING.

## Lifecycle

- `knowledge_base_synced_locations` cascades with its knowledge base, its connector and its organization; `knowledge_base_synced_files` with its location. Synced documents belong to the knowledge base (`sources.knowledgeBaseId`), so deleting the knowledge base, its owner or the organization removes them and their index entries as for every document.
- A file's `sourceId` is set to `null` when its document is deleted (`ON DELETE SET NULL`).
- The connector outlives a removed connection: its locations stay and report access lost until it is set up again.

## Infrastructure

- **`LocalSyncedLocationsRepository`** — TypeORM, tables `knowledge_base_synced_locations` and `knowledge_base_synced_files`. Files are written in batches with one `INSERT … ON CONFLICT (id) DO UPDATE` each and read under `FOR UPDATE` during a sync. Check constraints: `skipReason` is set exactly for skipped files, and only imported files have a document.
