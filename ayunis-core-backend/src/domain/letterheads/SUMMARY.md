# Letterheads Module

## Purpose

Manages organization-scoped letterhead templates (PDF backgrounds) used for official document generation. Each letterhead defines a first-page PDF and optional continuation-page PDF, along with validated page margins for content placement.

## Domain Concepts

- **Letterhead** — A named letterhead template belonging to an organization. Stores storage paths for first-page and optional continuation-page PDFs, plus validated page margins for each.
- **PageMargins** — Value object representing top/bottom/left/right margins in millimeters. Validated on construction to be non-negative finite numbers.

## Architecture

```text
letterheads/
├── domain/
│   ├── letterhead.entity.ts
│   ├── letterhead.errors.ts
│   └── value-objects/
│       └── page-margins.ts
├── application/
│   ├── letterheads.errors.ts
│   ├── ports/
│   │   └── letterheads-repository.port.ts
│   ├── services/
│   │   └── letterhead-pdf.service.ts   # Shared PDF validation & storage path builder
│   └── use-cases/
│       ├── create-letterhead/
│       ├── delete-letterhead/
│       ├── find-all-letterheads/
│       ├── find-letterhead/
│       └── update-letterhead/
├── infrastructure/
│   └── persistence/local/
│       ├── schema/
│       │   └── letterhead.record.ts
│       ├── mappers/
│       │   └── letterhead.mapper.ts
│       ├── local-letterheads.repository.ts
│       └── local-letterheads-repository.module.ts
├── presenters/http/
│   ├── letterheads.controller.ts
│   ├── dtos/
│   │   ├── create-letterhead.dto.ts
│   │   ├── update-letterhead.dto.ts
│   │   ├── letterhead-response.dto.ts
│   │   └── page-margins.dto.ts
│   └── mappers/
│       └── letterhead-dto.mapper.ts
└── letterheads.module.ts
```

## Dependencies

- **StorageModule** — File storage for uploaded letterhead PDFs and streaming downloads of stored PDFs

## Ports

- **LetterheadsRepository** — CRUD for letterhead entities, including optimistic updates that persist only when the stored version is unchanged

## Key Behaviors

- Page margins are validated (non-negative, finite) when a `Letterhead` entity is constructed
- Uploaded PDFs are validated with `pdf-lib` and must be exactly one page each
- Create stores the first-page PDF and optional continuation PDF under org-scoped storage paths like `letterheads/<orgId>/<letterheadId>/...`; if a later upload or persistence fails, it removes every PDF uploaded by that attempt
- Update stores replacement PDFs under immutable revision paths and conditionally persists against the version it read, so concurrent edits cannot restore a superseded object path. It then removes superseded objects. If persistence or a later replacement upload fails, it removes any uncommitted revision while preserving the PDFs still referenced by the database. Cleanup remains best effort so storage failures cannot roll back committed database state.
- Find-all and find-one are organization-scoped via request context
- Delete throws `LetterheadNotFoundError` if no matching record exists
- Each letterhead is scoped to an organization via `orgId`
- Download endpoints stream the first-page or continuation-page PDF as a `StreamableFile` response
- Other modules (notably **artifacts** and **runs**) consume this module to validate letterhead assignments and expose available letterheads to document tools
