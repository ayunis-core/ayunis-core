# Artifacts Module

## Purpose

Manages versioned artifacts (documents, diagrams, spreadsheets, and email drafts) attached to threads. Artifacts are created and updated by AI tools (`create_document`, `update_document`, `edit_document`, and email artifact tools) or by users via the editors. Each modification creates a new version, enabling full version history with revert capability. Document artifacts can also be linked to an optional organization letterhead that is applied during PDF export.

## Domain Concepts

- **Artifact** — A named, typed artifact belonging to a thread and user. Tracks the current version number; only document artifacts can have an optional `letterheadId` used for PDF export.
- **DocumentArtifact** — An artifact whose version content is sanitized HTML and may be exported to DOCX or PDF.
- **DiagramArtifact** — An artifact whose version content is stored without document HTML sanitization or spreadsheet normalization.
- **SpreadsheetArtifact** — An artifact whose version content is validated and canonicalized `spreadsheet-v1` JSON.
- **EmailArtifact** — An artifact whose version content is validated and canonicalized `email-v1` JSON. Drafts are sent only through explicit user confirmation.
- **ArtifactVersion** — An immutable snapshot of an artifact's serialized content at a specific version number. The content representation depends on the artifact type, and each version tracks who authored it (user or assistant).
- **EmailDelivery** — An idempotent delivery record keyed by email artifact and version, tracking `pending`, `sent`, or `failed` status.
- **ArtifactType** — Enum distinguishing `DOCUMENT`, `DIAGRAM`, `SPREADSHEET`, and `EMAIL` artifacts.
- **AuthorType** — Enum distinguishing whether a version was created by a `USER` or `ASSISTANT`.

## Architecture

```text
artifacts/
├── domain/
│   ├── artifact.entity.ts
│   ├── artifact-version.entity.ts
│   ├── email-delivery.entity.ts
│   └── value-objects/
│       ├── artifact-type.enum.ts
│       └── author-type.enum.ts
├── application/
│   ├── artifacts.errors.ts
│   ├── helpers/
│   │   ├── add-version-with-retry.ts
│   │   ├── email-content-format.ts
│   │   ├── evaluate-spreadsheet.ts
│   │   ├── prepare-content-for-write.ts
│   │   ├── spreadsheet-content-format.ts
│   │   └── sanitize-html-content.ts
│   ├── ports/
│   │   ├── artifacts-repository.port.ts
│   │   ├── email-delivery.repository.port.ts
│   │   ├── document-export.port.ts
│   │   └── spreadsheet-export.port.ts
│   └── use-cases/
│       ├── apply-edits-to-artifact/
│       ├── create-artifact/
│       ├── update-artifact/
│       ├── find-artifacts-by-thread/
│       ├── find-artifact-with-versions/
│       ├── revert-artifact/
│       ├── export-artifact/
│       └── send-email-artifact/
├── infrastructure/
│   ├── persistence/local/
│   │   ├── schema/
│   │   │   ├── email-artifact.record.ts
│   │   │   └── email-delivery.record.ts
│   │   ├── mappers/
│   │   │   └── email-delivery.mapper.ts
│   │   ├── local-artifacts.repository.ts
│   │   ├── local-email-delivery.repository.ts
│   │   ├── local-artifacts-repository.module.ts
│   │   └── unique-constraint.util.ts
│   └── export/
│       ├── html-document-export.service.ts
│       ├── html-to-docx-converter.ts
│       ├── paragraph-style-parser.ts
│       ├── docx-document-config.ts
│       ├── pdf-letterhead-compositor.ts
│       └── xlsx-spreadsheet-export.service.ts
├── presenters/http/
│   ├── artifacts.controller.ts
│   ├── dtos/
│   └── mappers/
└── artifacts.module.ts
```

## Dependencies

- **ThreadsModule** — Imported for thread ownership validation when creating artifacts
- **LetterheadsModule** — Imported for letterhead validation when creating or updating artifacts
- **StorageModule** — Imported for downloading letterhead PDFs during export
- **EmailsModule** — Imported to dispatch explicitly requested email artifact deliveries

## Ports

- **ArtifactsRepository** — CRUD for artifacts and versions
- **DocumentExportPort** — Converts HTML content to DOCX/PDF buffers, optionally compositing PDF output onto stored letterhead backgrounds with configured margins
- **SpreadsheetExportPort** — Converts validated spreadsheet content to XLSX or CSV buffers
- **EmailDeliveryRepository** — Stores one delivery state per email artifact version and atomically claims retryable deliveries

## Key Behaviors

- Creating an artifact also creates version 1
- Creating an artifact can optionally attach a validated `letterheadId`
- Updating an artifact adds a new version and increments `currentVersionNumber`
- Updating can also change or clear the letterhead without creating a new version when only the letterhead assignment changes
- Applying edits performs search-and-replace patches on the current content, creating a new version (errors on ambiguous or missing matches)
- Reverting copies content from a target version into a new version (non-destructive)
- Deleting a thread cascade-deletes all its artifacts and versions
- PDF export resolves the artifact's letterhead, downloads its PDFs from storage, and composites the rendered content onto the first-page / continuation-page backgrounds; if letterhead resolution fails, export falls back to a plain PDF
- Export delegates to `DocumentExportPort` for format conversion; PDF rendering blocks non-embedded resource requests and reports renderer deadlines as `ARTIFACT_EXPORT_TIMEOUT` (504) without retrying the same timed-out content
- Spreadsheet export delegates to `SpreadsheetExportPort`; XLSX preserves original formula-cell provenance through PII de-anonymization and emits live formulas only after successful local evaluation and dependency validation, while unsupported formulas remain text and CSV formula-like values are neutralized
- Document HTML sanitization (XSS prevention) before storage and export
- Spreadsheet content uses the versioned `spreadsheet-v1` JSON format with shape, size, and formula-length validation plus row canonicalization; formulas remain inert until export
- Email content uses the versioned `email-v1` JSON format with recipient validation and a plain-text body
- Email delivery resolves PII tokens immediately before SMTP dispatch and prevents duplicate sends for the same artifact version; stale pending leases can be retried after a bounded timeout
- Diagram content is stored without document HTML or spreadsheet normalization
- Content size validation (max ~512K characters) on create and update
- Thread ownership verification when creating artifacts
- Email delivery is explicit and never triggered by create/update tools; `POST /artifacts/:id/send` sends only the saved current version
- Retry-on-conflict logic for version number uniqueness (unique constraint + up to 3 retries)
