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
│   │   └── letterhead-pdf.service.ts
│   └── use-cases/
│       ├── create-letterhead/
│       │   ├── create-letterhead.command.ts
│       │   └── create-letterhead.use-case.ts
│       ├── find-all-letterheads/
│       │   └── find-all-letterheads.use-case.ts
│       ├── find-letterhead/
│       │   ├── find-letterhead.query.ts
│       │   └── find-letterhead.use-case.ts
│       ├── update-letterhead/
│       │   ├── update-letterhead.command.ts
│       │   └── update-letterhead.use-case.ts
│       └── delete-letterhead/
│           ├── delete-letterhead.command.ts
│           └── delete-letterhead.use-case.ts
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

- **StorageModule** — Used for uploading letterhead PDF files to storage

## Ports

- **LetterheadsRepository** — CRUD for letterhead entities (find by org, find by ID, save, delete)

## Use Cases

- **CreateLetterheadUseCase** — Creates a new letterhead with uploaded PDF files
- **FindAllLetterheadsUseCase** — Lists all letterheads for the current organization
- **FindLetterheadUseCase** — Retrieves a single letterhead by ID
- **UpdateLetterheadUseCase** — Updates letterhead properties and/or PDF files
- **DeleteLetterheadUseCase** — Removes a letterhead

## Key Behaviors

- Page margins are validated (non-negative, finite) when a `Letterhead` entity is constructed
- Delete throws `LetterheadNotFoundError` if no matching record exists
- Each letterhead is scoped to an organization via `orgId`
- PDF files must be exactly 1 page (validated on upload)
