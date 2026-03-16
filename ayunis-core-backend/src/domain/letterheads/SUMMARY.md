# Letterheads Module

## Purpose

Manages organization letterheads (PDF templates) used for document generation. Letterheads define page backgrounds and margin configurations for first and continuation pages, allowing branded documents to be generated with consistent styling.

## Domain Concepts

- **Letterhead** — A PDF template owned by an organization with separate configurations for first and continuation pages, including storage paths and page margins.
- **PageMargins** — Value object defining top, bottom, left, and right margins in millimeters.

## Architecture

```text
letterheads/
├── domain/
│   ├── letterhead.entity.ts
│   └── value-objects/
│       └── page-margins.ts
├── application/
│   ├── letterheads.errors.ts
│   └── ports/
│       └── letterheads-repository.port.ts
├── infrastructure/
│   └── persistence/local/
│       ├── schema/
│       │   └── letterhead.record.ts
│       ├── mappers/
│       │   ├── letterhead.mapper.ts
│       │   └── letterhead.mapper.spec.ts
│       ├── local-letterheads.repository.ts
│       └── local-letterheads-repository.module.ts
└── letterheads.module.ts
```

## Ports

- **LetterheadsRepository** — CRUD operations for letterheads (`findAllByOrgId`, `findById`, `save`, `delete`)

## Infrastructure

- **LocalLetterheadsRepository** — TypeORM implementation backed by `letterheads` table
- **LetterheadRecord** — TypeORM entity with organization index
- **LetterheadMapper** — Domain ↔ Record conversion

## Error Types

- **LetterheadNotFoundError** — Letterhead with specified ID does not exist
- **LetterheadInvalidPdfError** — Uploaded PDF is invalid or malformed
- **LetterheadOrgMismatchError** — Letterhead does not belong to the requesting organization

## Exports

None — this module does not currently export any use cases for external consumption.
