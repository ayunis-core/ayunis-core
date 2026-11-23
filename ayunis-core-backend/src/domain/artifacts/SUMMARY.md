# Artifacts Module

## Purpose

Manages versioned artifacts (documents, diagrams, and spreadsheets) attached to threads. Artifacts are created and updated by AI tools (`create_document`, `update_document`, `edit_document`) or by users via the WYSIWYG editor. Each modification creates a new version, enabling full version history with revert capability. Document artifacts can also be linked to an optional organization letterhead for DOCX and PDF exports.

## Domain Concepts

- **Artifact** — A named, typed artifact belonging to a thread and user. Tracks the current version number; only document artifacts can have an optional `letterheadId` used for DOCX and PDF exports.
- **DocumentArtifact** — An artifact whose version content is sanitized HTML and may be exported to DOCX or PDF.
- **DiagramArtifact** — An artifact whose version content is stored without document HTML sanitization or spreadsheet normalization.
- **SpreadsheetArtifact** — An artifact whose version content is validated and canonicalized `spreadsheet-v1` JSON.
- **ArtifactVersion** — An immutable snapshot of an artifact's serialized content at a specific version number. The content representation depends on the artifact type, and each version tracks who authored it (user or assistant).
- **ArtifactType** — Enum distinguishing `DOCUMENT`, `DIAGRAM`, and `SPREADSHEET` artifacts.
- **AuthorType** — Enum distinguishing whether a version was created by a `USER` or `ASSISTANT`.
- **Chat link** — A row in `thread_artifacts` (`threadId`, `artifactId`, `createdAt`, unique pair) connecting a chat to an artifact. Chats reach their artifacts only through links. The artifact still records the chat it was created in (`threadId`), which access checks and anonymization use until artifacts get their own owner.

## Architecture

```text
artifacts/
├── domain/
│   ├── artifact.entity.ts
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
│   │   ├── prepare-content-for-write.ts
│   │   ├── spreadsheet-content-format.ts
│   │   └── sanitize-html-content.ts
│   ├── ports/
│   │   ├── artifacts-repository.port.ts
│   │   ├── document-export.port.ts
│   │   └── spreadsheet-export.port.ts
│   ├── services/
│   │   └── user-content-masking.service.ts
│   └── use-cases/
│       ├── apply-edits-to-artifact/
│       ├── create-artifact/
│       ├── update-artifact/
│       ├── find-artifacts-by-thread/
│       ├── find-artifacts-by-workspace/
│       ├── find-artifact-with-versions/
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
- **ThreadPiiMasksModule** — Imported to mask user saves in anonymous chats and to resolve placeholders on export
- **WorkspacesModule** — Imported for workspace membership validation when listing artifacts
- **LetterheadsModule** — Imported for letterhead validation when creating or updating artifacts
- **StorageModule** — Imported for downloading letterhead PDFs during export

## Ports

- **ArtifactsRepository** — CRUD for artifacts, versions and chat links
- **DocumentExportPort** — Converts HTML content to DOCX/PDF buffers. PDF export composites stored letterhead backgrounds with configured margins. Word export rasterizes those backgrounds for first-page and continuation headers behind editable text. PDF letterhead exports render a header-less table as the DIN 5008 head block (recipient address left, sender information block right), tagged at render time by `letter-layout-tables.ts` because the editor schema would drop a stored marker
- **SpreadsheetExportPort** — Converts validated spreadsheet content to XLSX or CSV buffers

## Key Behaviors

- Creating an artifact also creates version 1 and the link to the chat it was created in, in the same transaction
- A chat's artifact list (`GET /artifacts/thread/:threadId`, used by the chat's side panel and by the runs module's tool assembly) returns the artifacts linked to the chat, in the order they were linked
- Lookups from a run (`linkedThreadId` on `FindArtifactWithVersionsQuery`, `UpdateArtifactCommand` and `ApplyEditsToArtifactCommand`) find an artifact only when it is linked to the run's chat, in addition to the user access rules; otherwise they fail with `ARTIFACT_NOT_FOUND` and nothing is written. Lookups from the HTTP API are not restricted by links
- Creating an artifact can optionally attach a validated `letterheadId`
- Updating an artifact adds a new version and increments `currentVersionNumber`
- Updating can also change or clear the letterhead without creating a new version when only the letterhead assignment changes
- User-authored content (`AuthorType.USER` on create or update) of an artifact whose chat is anonymous is masked through the chat's mask dictionary (`AnonymizeTextForThreadUseCase`) before it is stored, so the model never reads a real value a user typed. Documents and diagrams are masked as a whole; spreadsheets per header and string cell, with formulas untouched and strings the current version already stores skipped. Existing `{{pii:…}}` placeholders are kept. If masking fails or the chat cannot be found, the save fails and no version is stored. Assistant writes already contain placeholders and are stored as is
- The HTTP API always writes as `AuthorType.USER`; clients cannot choose the author. Only the artifact tool handlers write as `AuthorType.ASSISTANT`
- Applying edits performs search-and-replace patches on the current content, creating a new version (errors on ambiguous or missing matches)
- Reverting copies content from a target version into a new version (non-destructive)
- A write with a stale expected version fails with `ARTIFACT_EXPECTED_VERSION_MISMATCH`, whose message tells the model to call the read tool for the artifact's type (`read_document`, `read_diagram` or `read_spreadsheet`) and retry
- Deleting a thread cascade-deletes its links and all its artifacts and versions; deleting an artifact cascade-deletes its links
- PDF export resolves the artifact's letterhead, downloads its PDFs from storage, and composites the rendered content onto the first-page / continuation-page backgrounds; if letterhead resolution fails, export falls back to a plain PDF
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
