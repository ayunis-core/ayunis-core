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
│   └── use-cases/
├── infrastructure/
│   └── persistence/local/
│       ├── schema/
│       │   └── letterhead.record.ts
│       ├── mappers/
│       │   └── letterhead.mapper.ts
│       ├── local-letterheads.repository.ts
│       └── local-letterheads-repository.module.ts
├── presenters/http/
└── letterheads.module.ts
```

## Dependencies

None — standalone module.

## Ports

- **LetterheadsRepository** — CRUD for letterhead entities (find by org, find by ID, save, delete)

## Key Behaviors

- Page margins are validated (non-negative, finite) when a `Letterhead` entity is constructed
- Delete throws `LetterheadNotFoundError` if no matching record exists
- Each letterhead is scoped to an organization via `orgId`
