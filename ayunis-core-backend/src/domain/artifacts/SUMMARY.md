# Artifacts Module

## Purpose

Manages versioned artifacts (documents, diagrams, and spreadsheets), owned by a user or a workspace and linked to chats. Artifacts are created and updated by AI tools (`create_document`, `update_document`, `edit_document`) or by users via the WYSIWYG editor. Each modification creates a new version, enabling full version history with revert capability. Document artifacts can also be linked to an optional organization letterhead for DOCX and PDF exports.

## Domain Concepts

- **Artifact** — A named, typed artifact. Tracks the current version number; only document artifacts can have an optional `letterheadId` used for DOCX and PDF exports.
- **Owner** (`ArtifactOwner`, `domain/artifact-owner.ts`, in the vocabulary of the ownership module's `ResourceOwner`) — Exactly one of: the user, for an artifact created in a personal chat (`userId`), or the workspace, for one created in a workspace chat (`workspaceId`); a check constraint (`num_nonnulls("userId", "workspaceId") = 1`) enforces it. Artifacts never change owner, not even when their chat moves. The user who created the artifact is kept as `creatorId` (for delete rights) and cleared when that user is deleted. The artifact does not remember the chat it was created in.
- **Anonymous artifact** — An artifact created in an anonymous run (`isAnonymous`). Its stored title and content hold `{{pii:CATEGORY_n}}` placeholders numbered in its own dictionary, independent of any chat's.
- **ArtifactPiiMask** — One entry of an anonymous artifact's dictionary (`artifact_pii_masks`, unique `(artifactId, category, maskIndex)` and `(artifactId, category, value)`, deleted with the artifact): the real value behind one placeholder. There is no manual unmasking for artifacts; a chat's unmasking (AYC-807) stays with the chat.
- **DocumentArtifact** — An artifact whose version content is sanitized HTML and may be exported to DOCX or PDF.
- **DiagramArtifact** — An artifact whose version content is stored without document HTML sanitization or spreadsheet normalization.
- **SpreadsheetArtifact** — An artifact whose version content is validated and canonicalized `spreadsheet-v1` JSON.
- **ArtifactVersion** — An immutable snapshot of an artifact's serialized content at a specific version number. The content representation depends on the artifact type, and each version tracks who authored it (user or assistant).
- **ArtifactType** — Enum distinguishing `DOCUMENT`, `DIAGRAM`, and `SPREADSHEET` artifacts.
- **AuthorType** — Enum distinguishing whether a version was created by a `USER` or `ASSISTANT`.
- **Chat link** — A row in `thread_artifacts` (`threadId`, `artifactId`, `createdAt`, unique pair) connecting a chat to an artifact. Chats reach their artifacts only through links, and a link never grants access.

## Architecture

```text
artifacts/
├── domain/
│   ├── artifact.entity.ts
│   ├── artifact-owner.ts
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
│   │   ├── sanitize-html-content.ts
│   │   └── user-edit-placeholders.ts
│   ├── models/
│   │   ├── artifact-list.query.ts     # search, type and page of an owner's list
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
│       ├── attach-artifact-to-thread/
│       ├── create-artifact/
│       ├── delete-artifact/
│       ├── delete-thread-links-outside-scope/
│       ├── update-artifact/
│       ├── find-artifacts-by-thread/
│       ├── find-artifacts-by-workspace/
│       ├── find-artifacts-for-run/
│       ├── find-personal-artifacts/
│       ├── find-artifact-with-versions/
│       ├── read-artifact-in-run/
│       ├── revert-artifact/
│       └── export-artifact/
├── infrastructure/
│   ├── persistence/local/
│   │   ├── schema/
│   │   ├── mappers/
│   │   ├── queries/
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
│   ├── thread-artifacts.controller.ts  # POST /threads/:id/artifacts/:artifactId
│   ├── dtos/
│   └── mappers/
└── artifacts.module.ts
```

## Dependencies

- **ThreadsModule** — Imported for the chat a new artifact is created in or an artifact is attached to: its user, scope (owner) and anonymous flag. The threads module imports this module back (`forwardRef`) to drop a moved chat's links
- **ThreadPiiMasksModule** — Imported to read the chat's dictionary when a run writes and to allocate chat masks when a run reads
- **AnonymizationSettingsModule** — Imported to detect values in user saves of anonymous artifacts with the org's whitelists (`AnonymizeTextForOrgUseCase`)
- **WorkspacesModule** — Imported for workspace membership validation when listing a workspace's artifacts, and for `manage_workspace` when a member deletes a workspace artifact they did not create
- **LetterheadsModule** — Imported for letterhead validation when creating or updating artifacts
- **StorageModule** — Imported for downloading letterhead PDFs during export

## Ports

- **ArtifactsRepository** — CRUD for artifacts, versions, chat links and anonymous artifacts' dictionaries
- **DocumentExportPort** — Converts HTML content to DOCX/PDF buffers. PDF export composites stored letterhead backgrounds with configured margins. Word export rasterizes those backgrounds for first-page and continuation headers behind editable text. PDF letterhead exports render a header-less table as the DIN 5008 head block (recipient address left, sender information block right), tagged at render time by `letter-layout-tables.ts` because the editor schema would drop a stored marker
- **SpreadsheetExportPort** — Converts validated spreadsheet content to XLSX or CSV buffers

## Key Behaviors

- Creating an artifact also creates version 1 and the link to the chat it was created in, in the same transaction. Its owner is the chat's scope: the chat's user for a personal chat, the chat's workspace for a workspace chat; the creating user becomes `creatorId`
- Access follows the owner, for every read and write: a personal artifact is found only for its owner, a workspace artifact for every current member of the workspace, whoever created it. Non-members, org admins included, get `ARTIFACT_NOT_FOUND` (404) like for a missing artifact. The condition sits in the repository's lookups by id (`accessibleTo`, membership through the workspaces module's `memberWorkspace` condition), so detail, update, edits, revert and export all apply it; runs check as the chat's user
- Attaching an artifact to a chat (`POST /threads/:id/artifacts/:artifactId`, `AttachArtifactToThreadUseCase`, 204) links it to one of the caller's chats (`FindThreadUseCase`; another user's chat is `THREAD_NOT_FOUND`) if the caller may read it (otherwise `ARTIFACT_NOT_FOUND`, 404). The artifact must belong to the chat's scope, the user's personal artifacts for a personal chat and that workspace's for a workspace chat (`ARTIFACT_OUTSIDE_CHAT_SCOPE`, 400), and have the chat's mode, anonymous for an anonymous chat and normal for a normal one (`ARTIFACT_CHAT_MODE_MISMATCH`, 400). Attaching an artifact that is linked already changes nothing. The link is written by one statement that re-checks scope and mode while it holds the chat and artifact rows (`linkToMatchingThread`, `FOR SHARE`), so a chat moving to another scope at the same time either waits and then deletes the new link with its other outside-scope links, or makes the attachment fail
- A chat's artifact list (`GET /artifacts/thread/:threadId`, used by the chat's side panel and by the runs module's tool assembly) returns the artifacts linked to the chat that the caller may access, in the order they were linked; lookups through a chat (lists and run lookups) only find anything for the chat's own user
- A workspace's artifact list (`GET /artifacts/workspace/:workspaceId`, the workspace's artifact tab) returns every artifact the workspace owns, after `AssertWorkspaceReadAccessUseCase` checked the caller's membership
- The Ablage (`GET /artifacts/personal`, `FindPersonalArtifactsUseCase`) returns the caller's personal artifacts only, never workspace artifacts, not even the ones the caller created
- Both lists (`findByOwner`) are ordered by last change (`updatedAt`, newest first), paginated (`limit` up to 100, `offset`), filtered by `type` and by `isAnonymous` (the composer's picker lists only the artifacts of the chat's mode), and searched by title case-insensitively. The search matches the title as users see it: for anonymous artifacts the title with the placeholders its dictionary knows replaced by their real values, resolved in SQL (`queries/apply-artifact-title-search.ts`); known placeholders do not match by their own text
- Deleting an artifact (`DELETE /artifacts/:id`, `DeleteArtifactUseCase`) is allowed for a personal artifact to its owner and for a workspace artifact to its creator or to members holding `manage_workspace` in the workspace (`AssertWorkspaceWriteAccessUseCase`). Other members get `UNAUTHORIZED_ACCESS` (403) and the artifact stays; whoever cannot see the artifact (non-members, org admins included, and other users for personal artifacts) gets `ARTIFACT_NOT_FOUND` (404). Deleting removes its versions, dictionary and every chat link, so it leaves every chat's side panel and the tools of later runs. Responses carry `creatorId` so clients can offer delete only to those allowed
- Moving a chat to another scope (personal ↔ workspace, workspace ↔ workspace) deletes its links to artifacts the new scope does not own (`DeleteThreadLinksOutsideScopeUseCase`, called by the threads module in the move's transaction); the artifacts stay with their owner
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
- User-authored content (`AuthorType.USER` on create or update) of an anonymous artifact is masked before it is stored, so the model never reads a real value a user typed. The editor shows anonymous artifacts with their real values and saves them that way (`UserContentMaskingService`, helpers in `user-edit-placeholders.ts`):
  - Documents and diagrams are aligned with the current version by a word diff (`diff`'s `diffWordsWithSpace`, bounded by a timeout after which the whole text counts as changed): text and values the user left unchanged get exactly their stored form back, placeholders included, so saving without changes stores the same content and detects nothing. A value changed in part counts as changed text
  - In changed text, values of the artifact's dictionary are found by exact lookup (whole words, longest first) and keep their placeholders; detection with the org's whitelists (`AnonymizeTextForOrgUseCase`; a chat's manual unmasking does not apply to artifacts) masks the rest of the changed text with new entries in the artifact's dictionary. Documents carry values HTML-escaped (`&`, `<`, `>`), as the editor shows them, and store detected values unescaped
  - Spreadsheets are masked per header and string cell: a string that shows the same as one the current version stores gets that stored string back; any other string is new, with known values looked up in it and, unless it is a formula, detection for the rest
  - The title of an artifact created through the HTTP API is masked by detection. Existing `{{pii:…}}` placeholders, known or not, are kept. If masking fails, the save fails and no version is stored. Normal artifacts are stored as written
- The HTTP API always writes as `AuthorType.USER`; clients cannot choose the author. Only the artifact tool handlers write as `AuthorType.ASSISTANT`
- Applying edits performs search-and-replace patches on the current content, creating a new version (errors on ambiguous or missing matches)
- Reverting copies content from a target version into a new version (non-destructive)
- A write with a stale expected version fails with `ARTIFACT_EXPECTED_VERSION_MISMATCH`, whose message tells the model to call the read tool for the artifact's type (`read_document`, `read_diagram` or `read_spreadsheet`) and retry
- Deleting a chat, by its user or by retention, deletes only its links (`thread_artifacts.threadId` cascade); the artifacts stay. Deleting a user deletes their personal artifacts (`userId` cascade) and keeps the workspace artifacts they created with `creatorId` cleared (SET NULL). Deleting a workspace deletes its artifacts (`workspaceId` cascade). Deleting an artifact cascade-deletes its versions, links and dictionary
- Migrations `AddArtifactOwners`, `BackfillArtifactOwners` and `DropArtifactThreadId`: artifacts of workspace chats became the workspace's, artifacts of personal chats stayed with their user, every artifact's user became its creator, and the chat reference was dropped (every artifact already had its link to the chat, from `CreateThreadArtifactsTable`). Reverting gives every artifact the first chat linked to it and that chat's user, and deletes artifacts no chat links to, as they would have been deleted with their chat
- Migration `AddAnonymousArtifactDictionaries`: artifacts of anonymous chats became anonymous artifacts, each with a copy of its chat's entries for the placeholders that occur in its title or any of its versions (same tokens, title and content unchanged)
- PDF export resolves the artifact's letterhead, downloads its PDFs from storage, and composites the rendered content onto the first-page / continuation-page backgrounds; if letterhead resolution fails, export falls back to a plain PDF
- DOCX, PDF, XLSX and CSV exports of an anonymous artifact resolve its placeholders, in the content as in the file name, with the artifact's own dictionary, so they show real values even after the chat that wrote them is gone. `GET /artifacts/:id` returns `isAnonymous` and, with the versions, the dictionary (`piiMasks`) for anonymous artifacts; the chat and workspace lists return the entries their titles use, so clients show titles with real values
- DOCX export uses the same letterhead lookup and puts its artwork behind editable body text. The Word section uses the larger configured margin for each edge across the first and continuation pages, so text can reflow after editing.
- DOCX and PDF exports use organization typography defaults with or without a letterhead. A selected letterhead can override the font family and size independently.
- Export delegates to `DocumentExportPort` for format conversion; PDF rendering blocks non-embedded resource requests, waits only for the document load event rather than generic network idleness, and reports renderer deadlines as `ARTIFACT_EXPORT_TIMEOUT` (504) without retrying the same timed-out content
- Spreadsheet export delegates to `SpreadsheetExportPort`; XLSX preserves original formula-cell provenance through PII de-anonymization and emits live formulas only after successful local evaluation and dependency validation, while unsupported formulas remain text and CSV formula-like values are neutralized
- Document HTML sanitization (XSS prevention) before storage and export
- Spreadsheet content uses the versioned `spreadsheet-v1` JSON format with shape, size, and formula-length validation plus row canonicalization; formulas remain inert until export
- Diagram content is stored without document HTML or spreadsheet normalization
- Content size validation (max ~512K characters) on create and update
- Thread ownership verification when creating artifacts
- Workspace artifact listings ignore unsupported legacy discriminator values
- Retry-on-conflict logic for version number uniqueness (unique constraint + up to 3 retries)

Persistence adapters participating in synchronous `@Transactional()` paths resolve repositories through the ambient CLS transaction host at call time, with default-repository fallback for callers outside CLS. See [transaction enrollment](../../../TRANSACTIONS.md) for the convention and review checklist.
