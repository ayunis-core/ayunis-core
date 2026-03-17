# Artifacts Module

## Purpose

Manages versioned documents (artifacts) attached to threads. Artifacts are created and updated by AI tools (`create_document`, `update_document`, `edit_document`) or by users via the WYSIWYG editor. Each modification creates a new version, enabling full version history with revert capability. Artifacts can also be linked to an optional organization letterhead that is applied during PDF export.

## Domain Concepts

- **Artifact** — A named document belonging to a thread and user. Tracks the current version number and an optional `letterheadId` used for PDF export.
- **ArtifactVersion** — An immutable snapshot of an artifact's content (HTML string) at a specific version number. Tracks who authored it (user or assistant).
- **AuthorType** — Enum distinguishing whether a version was created by a `USER` or `ASSISTANT`.

## Architecture

```text
artifacts/
├── domain/
│   ├── artifact.entity.ts
│   ├── artifact-version.entity.ts
│   └── value-objects/
│       └── author-type.enum.ts
├── application/
│   ├── artifacts.errors.ts
│   ├── helpers/
│   │   ├── add-version-with-retry.ts
│   │   └── sanitize-html-content.ts
│   ├── ports/
│   │   ├── artifacts-repository.port.ts
│   │   └── document-export.port.ts
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
│       └── pdf-letterhead-compositor.ts
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
- HTML sanitization (XSS prevention) on all content before storage and export
- Content size validation (max ~512K characters) on create and update
- Thread ownership verification when creating artifacts
- Retry-on-conflict logic for version number uniqueness (unique constraint + up to 3 retries)
