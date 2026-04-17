---
name: seed-database
description: Seed the local development database with fixture data (org, user, models, subscription). Use when you need test data or login credentials.
---

# Seed Database

Populate the local dev database with minimal fixture data for development and testing.

## Commands

Run from `ayunis-core-backend/`:

| Command | Description |
|---|---|
| `npm run seed:minimal:ts` | Upsert fixture data (idempotent — skips existing rows) |
| `npm run seed:clean:ts` | Truncate all tables first, then seed |

The `:ts` variants run from source; the non-`:ts` variants run from `dist/` (requires a build).

## What Gets Seeded

Defined in `src/db/fixtures/minimal.fixture.ts`:

| Entity | Key values |
|---|---|
| **Org** | `Demo Org` |
| **User** | `admin@demo.local` / `admin` — Admin + Super Admin, email verified |
| **Language model** | `eu.anthropic.claude-sonnet-4-6` (Bedrock) — streaming, tools, vision |
| **Embedding model** | `text-embedding-3-large` (OpenAI) — 1536 dimensions |
| **Subscription** | 5 seats, €10/seat, monthly renewal |
| **Permitted models** | Language model (default), embedding model |

## Default Login Credentials

```text
Email:    admin@demo.local
Password: admin
```

## Prerequisites

The database must be running. Check with:

```bash
./dev status
```

If infrastructure isn't up, see the `dev-environment` skill.
