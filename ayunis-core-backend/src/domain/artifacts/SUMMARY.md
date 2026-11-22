# Artifacts Module

## Purpose

Manages versioned artifacts (documents, diagrams, and spreadsheets) attached to threads. Artifacts are created and updated by AI tools (`create_document`, `update_document`, `edit_document`) or by users via the WYSIWYG editor. Each modification creates a new version, enabling full version history with revert capability. Document artifacts can also be linked to an optional organization letterhead for DOCX and PDF exports.

## Domain Concepts

- **Artifact** — A named, typed artifact belonging to a thread and user. Tracks the current version number; only document artifacts can have an optional `letterheadId` used for DOCX and PDF exports.
- **Anonymous artifact** — An artifact created in an anonymous run (`isAnonymous`). Its stored title and content hold `{{pii:CATEGORY_n}}` placeholders numbered in its own dictionary, independent of any chat's.
- **ArtifactPiiMask** — One entry of an anonymous artifact's dictionary (`artifact_pii_masks`, unique `(artifactId, category, maskIndex)` and `(artifactId, category, value)`, deleted with the artifact): the real value behind one placeholder. There is no manual unmasking for artifacts; a chat's unmasking (AYC-807) stays with the chat.
- **DocumentArtifact** — An artifact whose version content is sanitized HTML and may be exported to DOCX or PDF.
- **DiagramArtifact** — An artifact whose version content is stored without document HTML sanitization or spreadsheet normalization.
- **SpreadsheetArtifact** — An artifact whose version content is validated and canonicalized `spreadsheet-v1` JSON.
- **ArtifactVersion** — An immutable snapshot of an artifact's serialized content at a specific version number. The content representation depends on the artifact type, and each version tracks who authored it (user or assistant).
- **ArtifactType** — Enum distinguishing `DOCUMENT`, `DIAGRAM`, and `SPREADSHEET` artifacts.
- **AuthorType** — Enum distinguishing whether a version was created by a `USER` or `ASSISTANT`.
- **Chat link** — A row in `thread_artifacts` (`threadId`, `artifactId`, `createdAt`, unique pair) connecting a chat to an artifact. Chats reach their artifacts only through links. The artifact still records the chat it was created in (`threadId`), which access checks and the detection of user saves use until artifacts get their own owner.

## Architecture

```text
artifacts/
├── domain/
│   ├── artifact.entity.ts
│   ├── artifact-pii-mask.entity.ts
│   ├── artifact-version.entity.ts
│   ├── artifacts.constants.ts
│   └── value-objects/
│       ├── artifact-type.enum.ts
│       └── author-type.enum.ts
├── application/
│   ├── artifacts.errors.ts
│   ├── helpers/
│   │   ├── add-version-with-retry.ts
│   │   ├── evaluate-spreadsheet.ts
│   │   ├── map-content-text.ts
│   │   ├── prepare-content-for-write.ts
│   │   ├── spreadsheet-content-format.ts
│   │   └── sanitize-html-content.ts
│   ├── models/
│   │   ├── artifact-run.ts            # the run a lookup or write comes from
│   │   └── placeholder-draft.ts
│   ├── ports/
│   │   ├── artifacts-repository.port.ts
│   │   ├── document-export.port.ts
│   │   └── spreadsheet-export.port.ts
│   ├── services/
│   │   ├── artifact-mask-allocation-lock.service.ts
│   │   ├── artifact-placeholders.service.ts
│   │   └── user-content-masking.service.ts
│   └── use-cases/
│       ├── apply-edits-to-artifact/
│       ├── create-artifact/
│       ├── update-artifact/
│       ├── find-artifacts-by-thread/
│       ├── find-artifacts-by-workspace/
│       ├── find-artifacts-for-run/
│       ├── find-artifact-with-versions/
│       ├── read-artifact-in-run/
│       ├── revert-artifact/
│       └── export-artifact/
├── infrastructure/
│   ├── persistence/local/
│   │   ├── schema/
│   │   ├── mappers/
│   │   ├── testing/
│   │   ├── local-artifacts.repository.ts
│   │   └── local-artifacts-repository.module.ts
│   └── export/
│       ├── html-document-export.service.ts
│       ├── html-to-docx-converter.ts
│       ├── paragraph-style-parser.ts
│       ├── run-color-parser.ts
│       ├── docx-document-config.ts
│       ├── docx-letterhead.ts
│       ├── docx-table-styles.ts
│       ├── letter-layout-tables.ts
│       ├── pdf-letterhead-compositor.ts
│       └── xlsx-spreadsheet-export.service.ts
├── presenters/http/
│   ├── artifacts.controller.ts
│   ├── dtos/
│   └── mappers/
└── artifacts.module.ts
```

## Dependencies

- **ThreadsModule** — Imported for thread ownership validation when creating artifacts and for the chat's anonymous flag on user saves
- **ThreadPiiMasksModule** — Imported to detect values in user saves of anonymous artifacts, to read the chat's dictionary when a run writes, and to allocate chat masks when a run reads
- **WorkspacesModule** — Imported for workspace membership validation when listing artifacts
- **LetterheadsModule** — Imported for letterhead validation when creating or updating artifacts
- **StorageModule** — Imported for downloading letterhead PDFs during export

## Ports

- **ArtifactsRepository** — CRUD for artifacts, versions, chat links and anonymous artifacts' dictionaries
- **DocumentExportPort** — Converts HTML content to DOCX/PDF buffers. PDF export composites stored letterhead backgrounds with configured margins. Word export rasterizes those backgrounds for first-page and continuation headers behind editable text. PDF letterhead exports render a header-less table as the DIN 5008 head block (recipient address left, sender information block right), tagged at render time by `letter-layout-tables.ts` because the editor schema would drop a stored marker
- **SpreadsheetExportPort** — Converts validated spreadsheet content to XLSX or CSV buffers

## Key Behaviors

- Creating an artifact also creates version 1 and the link to the chat it was created in, in the same transaction
- A chat's artifact list (`GET /artifacts/thread/:threadId`, used by the chat's side panel and by the runs module's tool assembly) returns the artifacts linked to the chat, in the order they were linked
- Lookups from a run (`ArtifactRun` on `ReadArtifactInRunQuery`, `UpdateArtifactCommand` and `ApplyEditsToArtifactCommand`) find an artifact only when it is linked to the run's chat and matches the run's mode (anonymous runs anonymous artifacts, normal runs normal ones; the runs module decides the mode: anonymous chat or a model with enforced anonymous mode), in addition to the user access rules; otherwise they fail with `ARTIFACT_NOT_FOUND` and nothing is written. Lookups from the HTTP API are not restricted by links or mode
- An artifact created by a run gets the run's mode; one created through the HTTP API the mode of its chat
- Creating an artifact can optionally attach a validated `letterheadId`
- Updating an artifact adds a new version and increments `currentVersionNumber`
- Updating can also change or clear the letterhead without creating a new version when only the letterhead assignment changes
- Placeholders of anonymous artifacts, in the title as in the content, are translated by exact lookup of their value, never by detection (`ArtifactPlaceholdersService`, numbering through `createMaskRegistry`):
  - A run reads (`ReadArtifactInRunUseCase` for one artifact's title and current version, `FindArtifactsForRunUseCase` for the titles of the artifacts a run is offered): artifact placeholder → value → the chat's placeholder for it; values the chat has none for get new chat masks through `AllocateThreadPiiMasksUseCase`. Whenever the text references chat masks, the read returns the chat's dictionary so the run streams it: masks created outside runs (an editor save's detection) have not reached the client yet. Placeholders the artifact does not know stay as they are
  - A run writes (create with its title, update, edit including `old_text` and `new_text`): chat placeholder → value → artifact placeholder; new values get new dictionary entries. A placeholder the chat does not know rejects the write with `ARTIFACT_UNKNOWN_PLACEHOLDER` (a retryable tool error) and nothing is stored
  - Spreadsheets are translated per header and string cell, formulas included
  - New dictionary entries are written in the transaction of the version that needs them (`addVersionAndUpdateArtifact`, or the transaction that creates the artifact), so a write that fails, e.g. on a version conflict, leaves none behind. For an existing artifact they are numbered under a per-artifact lock (`ArtifactMaskAllocationLock`, process-local; the unique constraints reject a duplicate across instances) that is held until the version is written
- User-authored content (`AuthorType.USER` on create or update) of an anonymous artifact is masked before it is stored, so the model never reads a real value a user typed: values are detected through the chat's anonymization (`AnonymizeTextForThreadUseCase`, with the chat's whitelists) and replaced with placeholders of the artifact's own dictionary. The title of an artifact created through the HTTP API is masked the same way. Documents and diagrams are masked as a whole; spreadsheets per header and string cell, with formulas untouched and strings the current version already stores skipped. Existing `{{pii:…}}` placeholders are kept. If masking fails, the save fails and no version is stored. Normal artifacts are stored as written
- The HTTP API always writes as `AuthorType.USER`; clients cannot choose the author. Only the artifact tool handlers write as `AuthorType.ASSISTANT`
- Applying edits performs search-and-replace patches on the current content, creating a new version (errors on ambiguous or missing matches)
- Reverting copies content from a target version into a new version (non-destructive)
- A write with a stale expected version fails with `ARTIFACT_EXPECTED_VERSION_MISMATCH`, whose message tells the model to call the read tool for the artifact's type (`read_document`, `read_diagram` or `read_spreadsheet`) and retry
- Deleting a thread cascade-deletes its links and all its artifacts and versions; deleting an artifact cascade-deletes its links and its dictionary
- Migration `AddAnonymousArtifactDictionaries`: artifacts of anonymous chats became anonymous artifacts, each with a copy of its chat's entries for the placeholders that occur in its title or any of its versions (same tokens, title and content unchanged)
- PDF export resolves the artifact's letterhead, downloads its PDFs from storage, and composites the rendered content onto the first-page / continuation-page backgrounds; if letterhead resolution fails, export falls back to a plain PDF
- DOCX, PDF, XLSX and CSV exports of an anonymous artifact resolve its placeholders, in the content as in the file name, with the artifact's own dictionary, so they show real values even after the chat that wrote them is gone. `GET /artifacts/:id` returns `isAnonymous` and, with the versions, the dictionary (`piiMasks`) for anonymous artifacts
- DOCX export uses the same letterhead lookup and puts its artwork behind editable body text. The Word section uses the larger configured margin for each edge across the first and continuation pages, so text can reflow after editing.
- DOCX and PDF exports use organization typography defaults with or without a letterhead. A selected letterhead can override the font family and size independently.
- Export delegates to `DocumentExportPort` for format conversion; PDF rendering blocks non-embedded resource requests, waits only for the document load event rather than generic network idleness, and reports renderer deadlines as `ARTIFACT_EXPORT_TIMEOUT` (504) without retrying the same timed-out content
- Spreadsheet export delegates to `SpreadsheetExportPort`; XLSX preserves original formula-cell provenance through PII de-anonymization and emits live formulas only after successful local evaluation and dependency validation, while unsupported formulas remain text and CSV formula-like values are neutralized
- Document HTML sanitization (XSS prevention) before storage and export
- Spreadsheet content uses the versioned `spreadsheet-v1` JSON format with shape, size, and formula-length validation plus row canonicalization; formulas remain inert until export
- Diagram content is stored without document HTML or spreadsheet normalization
- Content size validation (max ~512K characters) on create and update
- Thread ownership verification when creating artifacts
- Artifact lookups by id or by thread (detail, update, edits, revert, export, thread list) require, for an artifact in a workspace chat, that its creator is still a member of the workspace; they reuse the threads module's membership condition. Workspace listings check membership through `AssertWorkspaceReadAccessUseCase` before filtering by user
- Workspace artifact listings ignore unsupported legacy discriminator values
- Retry-on-conflict logic for version number uniqueness (unique constraint + up to 3 retries)

Persistence adapters participating in synchronous `@Transactional()` paths resolve repositories through the ambient CLS transaction host at call time, with default-repository fallback for callers outside CLS. See [transaction enrollment](../../../TRANSACTIONS.md) for the convention and review checklist.
