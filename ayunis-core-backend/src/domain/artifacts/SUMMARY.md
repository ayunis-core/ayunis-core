# Artifacts Module

## Purpose

Manages versioned artifacts (documents, diagrams, and spreadsheets) attached to threads. Artifacts are created and updated by AI tools (`create_document`, `update_document`, `edit_document`) or by users via the WYSIWYG editor. Each modification creates a new version, enabling full version history with revert capability. Document artifacts can also be linked to an optional organization letterhead that is applied during PDF export.

## Domain Concepts

- **Artifact** — A named, typed artifact belonging to a thread and user. Tracks the current version number; only document artifacts can have an optional `letterheadId` used for PDF export.
- **DocumentArtifact** — An artifact whose version content is sanitized HTML and may be exported to DOCX or PDF.
- **DiagramArtifact** — An artifact whose version content is stored without document HTML sanitization or spreadsheet normalization.
- **SpreadsheetArtifact** — An artifact whose version content is validated and canonicalized `spreadsheet-v1` JSON.
- **ArtifactVersion** — An immutable snapshot of an artifact's serialized content at a specific version number. The content representation depends on the artifact type, and each version tracks who authored it (user or assistant).
- **ArtifactType** — Enum distinguishing `DOCUMENT`, `DIAGRAM`, and `SPREADSHEET` artifacts.
- **AuthorType** — Enum distinguishing whether a version was created by a `USER` or `ASSISTANT`.

## Architecture

```text
artifacts/
├── domain/
│   ├── artifact.entity.ts
│   ├── artifact-version.entity.ts
│   └── value-objects/
│       ├── artifact-type.enum.ts
│       └── author-type.enum.ts
├── application/
│   ├── artifacts.errors.ts
│   ├── helpers/
│   │   ├── add-version-with-retry.ts
│   │   ├── prepare-content-for-write.ts
│   │   ├── spreadsheet-content-format.ts
│   │   └── sanitize-html-content.ts
│   ├── ports/
│   │   ├── artifacts-repository.port.ts
│   │   ├── document-export.port.ts
│   │   └── spreadsheet-export.port.ts
│   └── use-cases/
│       ├── apply-edits-to-artifact/
│       ├── create-artifact/
│       ├── update-artifact/
│       ├── find-artifacts-by-thread/
│       ├── find-artifact-with-versions/
│       ├── revert-artifact/
│       └── export-artifact/
├── infrastructure/
│   ├── persistence/local/
│   │   ├── schema/
│   │   ├── mappers/
│   │   ├── local-artifacts.repository.ts
│   │   ├── local-artifacts-repository.module.ts
│   │   └── unique-constraint.util.ts
│   └── export/
│       ├── html-document-export.service.ts
│       ├── html-to-docx-converter.ts
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

## Ports

- **ArtifactsRepository** — CRUD for artifacts and versions
- **DocumentExportPort** — Converts HTML content to DOCX/PDF buffers, optionally compositing PDF output onto stored letterhead backgrounds with configured margins
- **SpreadsheetExportPort** — Converts validated spreadsheet content to XLSX or CSV buffers

## Key Behaviors

- Creating an artifact also creates version 1
- Creating an artifact can optionally attach a validated `letterheadId`
- Updating an artifact adds a new version and increments `currentVersionNumber`
- Updating can also change or clear the letterhead without creating a new version when only the letterhead assignment changes
- Applying edits performs search-and-replace patches on the current content, creating a new version (errors on ambiguous or missing matches)
- Reverting copies content from a target version into a new version (non-destructive)
- Deleting a thread cascade-deletes all its artifacts and versions
- PDF export resolves the artifact's letterhead, downloads its PDFs from storage, and composites the rendered content onto the first-page / continuation-page backgrounds; if letterhead resolution fails, export falls back to a plain PDF
- Export delegates to `DocumentExportPort` for format conversion
- Spreadsheet export delegates to `SpreadsheetExportPort` for XLSX/CSV conversion, preserves original formula-cell provenance through PII de-anonymization, and neutralizes formula-like values in CSV output
- Document HTML sanitization (XSS prevention) before storage and export
- Spreadsheet content uses the versioned `spreadsheet-v1` JSON format with shape, size, and formula validation plus row canonicalization
- Diagram content is stored without document HTML or spreadsheet normalization
- Content size validation (max ~512K characters) on create and update
- Thread ownership verification when creating artifacts
- Retry-on-conflict logic for version number uniqueness (unique constraint + up to 3 retries)
