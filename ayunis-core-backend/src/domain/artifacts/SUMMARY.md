# Artifacts Module

## Purpose

Manages versioned documents (artifacts) attached to threads. Artifacts are created and updated by AI tools (`create_document`, `update_document`) or by users via the WYSIWYG editor. Each modification creates a new version, enabling full version history with revert capability.

## Domain Concepts

- **Artifact** — A named document belonging to a thread and user. Tracks the current version number.
- **ArtifactVersion** — An immutable snapshot of an artifact's content (HTML string) at a specific version number. Tracks who authored it (user or assistant).
- **AuthorType** — Enum distinguishing whether a version was created by a `USER` or `ASSISTANT`.

## Architecture

```
artifacts/
├── domain/
│   ├── artifact.entity.ts
│   ├── artifact-version.entity.ts
│   └── value-objects/
│       └── author-type.enum.ts
├── application/
│   ├── artifacts.errors.ts
│   ├── ports/
│   │   ├── artifacts-repository.port.ts
│   │   └── document-export.port.ts
│   └── use-cases/
│       ├── create-artifact/
│       ├── update-artifact/
│       ├── find-artifacts-by-thread/
│       ├── find-artifact-with-versions/
│       ├── revert-artifact/
│       └── export-artifact/
├── infrastructure/
│   ├── persistence/postgres/
│   │   ├── schema/
│   │   ├── mappers/
│   │   └── postgres-artifacts.repository.ts
│   └── export/
│       └── html-document-export.service.ts
├── presenters/http/
│   ├── artifacts.controller.ts
│   ├── dtos/
│   └── mappers/
└── artifacts.module.ts
```

## Ports

- **ArtifactsRepository** — CRUD for artifacts and versions
- **DocumentExportPort** — Converts HTML content to DOCX/PDF buffers

## Key Behaviors

- Creating an artifact also creates version 1
- Updating an artifact adds a new version and increments `currentVersionNumber`
- Reverting copies content from a target version into a new version (non-destructive)
- Deleting a thread cascade-deletes all its artifacts and versions
- Export delegates to `DocumentExportPort` for format conversion
