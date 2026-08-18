# Thread PII Masks Module

## Purpose

Stores the per-thread mask dictionary behind anonymous mode: every PII value detected in an anonymous thread is replaced by a stable `{{pii:CATEGORY_n}}` token, and this module owns the token → original value mapping. The LLM provider only ever sees tokens; the frontend resolves them back to the original values for display.

## Domain Concepts

- **ThreadPiiMask** — One dictionary entry: the original value, its `PiiCategory`, and a per-thread, per-category 1-based `maskIndex`. The `token` getter renders the placeholder (e.g. `{{pii:PERSON_NAME_1}}`).
- **Stable numbering** — The same (category, value) pair always resolves to the same token within a thread; new values get the next free index. Numbering and dedup live in `applyMaskReplacements` (`src/common/anonymization/domain/apply-mask-replacements.ts`); this module supplies the existing masks and persists new ones.
- **Manual unmasking (AYC-807)** — A user can permanently unmask one entry for their thread. The row is kept (`unmasked = true`) so its token still resolves in stored messages and its index stays reserved, but the value becomes a thread-scoped whitelist entry (`domain/unmasked-mask-whitelist.ts`) so it is no longer masked going forward, and the `runs` module reveals its tokens to the LLM. Admin whitelists are untouched.

## Architecture

```text
thread-pii-masks/
├── domain/
│   ├── thread-pii-mask.entity.ts
│   └── unmasked-mask-whitelist.ts           # unmasked mask → escaped PiiWhitelistEntry
├── application/
│   ├── thread-pii-masks.errors.ts
│   ├── ports/
│   │   └── thread-pii-mask.repository.ts
│   └── use-cases/
│       ├── anonymize-text-for-thread/   # whitelist + existing masks → anonymize → persist new masks
│       ├── get-thread-pii-masks/
│       └── unmask-thread-pii-mask/      # sets unmasked = true (idempotent), returns full dictionary
├── infrastructure/
│   └── persistence/postgres/
│       ├── schema/thread-pii-mask.record.ts   # unique (threadId, category, maskIndex) and (threadId, category, value)
│       ├── mappers/thread-pii-mask.mapper.ts
│       └── thread-pii-mask.repository.ts
├── presenters/
│   └── http/
│       ├── dtos/pii-mask-response.dto.ts      # { id, token, value, category, unmasked } — no controller; embedded by threads/runs
│       └── mappers/pii-mask.mapper.ts
└── thread-pii-masks.module.ts
```

## Key Flows

- **AnonymizeTextForThreadUseCase** — Loads the org PII whitelist (via `GetPiiWhitelistUseCase` from `anonymization-settings`) and the thread's existing masks, folds the thread's manually unmasked values into the whitelist, delegates to the common `AnonymizeTextUseCase` in mask mode, persists newly created masks *before* returning, and returns the anonymized text plus the full updated dictionary. Engine failures propagate unchanged so callers keep their fail-safe handling (run aborts, original text never leaks).
- **GetThreadPiiMasksUseCase** — Returns a thread's dictionary; used by the threads GET endpoint so the frontend can resolve tokens after a reload.
- **UnmaskThreadPiiMaskUseCase** — Marks one entry as manually unmasked. Exposed via `POST /threads/:id/pii-masks/:maskId/unmask` on the threads controller (which asserts thread ownership first). Idempotent; a missing mask yields a 404 `ThreadPiiMaskNotFoundError`.

## Consumers

- `runs` — anonymizes user input and PII-returning tool results, streams new masks to the client as `masks` SSE events, and reveals unmasked tokens in the LLM-bound history (`UnmaskedTermsService`).
- `threads` — embeds the dictionary in the thread GET response for anonymous threads and hosts the unmask endpoint.
