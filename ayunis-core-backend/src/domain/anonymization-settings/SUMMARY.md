# Anonymization Settings Module

## Purpose

Owns the whitelists that exempt detected PII from anonymization before text reaches the language model. Two scopes exist: the **org whitelist** (one optional regex rule per PII category, maintained by org admins) and the **global whitelist** (plain words maintained by super admins, applied in every organization on top of the org's own rules — AYC-446). Matching itself lives in `src/common/anonymization` (`whitelist-filter.ts`); this module stores the rules and provides them to the pipeline.

## Domain Concepts

- **AnonymizationWhitelistEntry** — Org-level rule: one PII category, optionally restricted to values fully matching a regex (`pattern === null` exempts the whole category). At most one entry per (org, category).
- **GlobalAnonymizationWhitelistWord** — Platform-wide plain word for one category. Matching is case-insensitive against the whole detected value; the original casing is kept for display. Uniqueness is case-insensitive per category via a normalized `wordLowercase` column.
- **validate-pattern** — Save-time guard for org regexes: max length, must compile, must pass `safe-regex2` (ReDoS).

## Architecture

```text
anonymization-settings/
├── domain/
│   ├── anonymization-whitelist-entry.entity.ts
│   ├── global-anonymization-whitelist-word.entity.ts
│   └── validate-pattern.ts
├── application/
│   ├── anonymization-settings.errors.ts
│   ├── ports/
│   │   ├── anonymization-whitelist.repository.ts
│   │   └── global-anonymization-whitelist.repository.ts
│   └── use-cases/
│       ├── get-pii-whitelist/            # org entries for one org
│       ├── update-pii-whitelist/         # full replacement of an org's entries
│       ├── get-global-pii-whitelist/     # all global words (exported for consumers outside the module)
│       └── anonymize-text-for-org/       # whitelist → common AnonymizeTextUseCase
├── infrastructure/
│   └── persistence/postgres/
│       ├── schema/                       # anonymization_whitelist_entries, global_anonymization_whitelist_words
│       ├── mappers/
│       ├── anonymization-whitelist.repository.ts
│       └── global-anonymization-whitelist.repository.ts
├── presenters/
│   └── http/                             # org admin endpoints (@Roles(ADMIN), org-scoped via @CurrentUser)
└── anonymization-settings.module.ts
```

## Key Flows

- **Applying exceptions** — Detection runs in the `ayunis-core-anonymize` service; the common `AnonymizeTextUseCase` drops detections the whitelist exempts. There is no caching — every anonymization call reads the DB, so whitelist changes take effect immediately.
- **Org settings screen** — `GET/PUT /anonymization-settings/pii-whitelist` back the org admin page (`/admin-settings/anonymization`).

## Consumers

- `thread-pii-masks` — `AnonymizeTextForThreadUseCase` (the main chat path) injects `GetPiiWhitelistUseCase`.
- `runs` — uses `AnonymizeTextForOrgUseCase` for thread title generation.
