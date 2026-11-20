# Memory Module

Per-user key/value store of text snippets that the assistant reads on every run and writes during a conversation, so stable facts about a user survive across threads.

Two keys are reserved: **`personal`** (who the user is — role, department, organization, responsibilities) and **`preferences`** (how they want to be served — tone, form of address, output formats). The runs module renders both in full in the system prompt; every other key is listed by name plus a one-line **description** of when it is relevant, and its content is pulled in on demand via the `get_memory` tool. The description works like a skill description: a trigger the model can judge relevance by without loading the entry. Reserved keys are *virtual*: no row exists until the assistant writes one, so "always present" means always described in the prompt and always listed in the API response.

Memory is strictly personal. Every use case derives the owner from the request context, so no API shape can address another user's memory.

## Domain

- **`MemoryEntry`** — One snippet (`id`, `userId`, `key`, `content`, `description`, `createdAt`, `updatedAt`). Unique per (`userId`, `key`). `description` is optional (≤ 150 characters) and only meaningful for non-reserved keys.
- **`memory.constants.ts`** — `RESERVED_MEMORY_KEYS`, key validation (`^[a-z][a-z0-9_]*$`, ≤ 48 chars), and the bounds that keep the system prompt finite: ≤ 2,000 characters per entry, ≤ 50 entries per user.

## Ports

- **`MemoryRepository`** — `findAllByUserId`, `findByUserIdAndKey`, `upsertWithinLimit`, `deleteByUserIdAndKey`, `deleteAllByUserId`

## Use Cases

- **`FindUserMemoryUseCase`** — All entries of the authenticated user
- **`GetMemoryEntryUseCase`** — One entry by key (`null` when absent)
- **`UpsertMemoryEntryUseCase`** — Creates or replaces an entry; enforces key shape, non-blank content, content and description length and the entry limit. Blank content is rejected, because removing an entry is a delete. An omitted description keeps the stored one, an empty one clears it
- **`DeleteMemoryEntryUseCase`** — Removes an entry (idempotent). A reserved key is cleared rather than removed, because the key itself always stays available
- **`ClearUserMemoryUseCase`** — Removes every entry of the authenticated user

## Infrastructure

- **`LocalMemoryRepository`** — TypeORM implementation backed by `user_memory_entries`. `upsertWithinLimit` holds a per-user advisory lock for its transaction, so concurrent writes (tool calls of one turn run in parallel) cannot add more new keys than the limit; the write itself is an `INSERT … ON CONFLICT DO UPDATE` touching only `content`, `updatedAt` and, unless the stored one is kept, `description`.
- **`MemoryEntryRecord`** — Unique constraint on (`userId`, `key`) and FK to `users` with cascade delete, which is what makes account deletion erase memory.

## HTTP API

Controller: `MemoryController`, base path `/memory`, tag `Memory`. Behind the `memoryEnabled` feature flag (`FEATURE_MEMORY_ENABLED`, off by default): every route answers 404 while it is off.

| Method | Path           | Description                                                  |
| ------ | -------------- | ------------------------------------------------------------ |
| GET    | `/memory`      | List the user's memory; reserved keys always included, first |
| PUT    | `/memory/:key` | Create or replace one entry                                  |
| DELETE | `/memory/:key` | Delete one entry (clear, for a reserved key)                 |
| DELETE | `/memory`      | Delete the user's whole memory                               |

## Exports

- `FindUserMemoryUseCase` — runs module: loads the snapshot for the system prompt; tools module: lists available keys on a `get_memory` miss; onboarding module: whether `personal` has content (onboarding stage)
- `GetMemoryEntryUseCase` — tools module: backs `get_memory`
- `UpsertMemoryEntryUseCase` / `DeleteMemoryEntryUseCase` — tools module: back `set_memory` (empty content removes)

## Consumers

- **`tools`** — `GetMemoryTool` / `SetMemoryTool` and their handlers
- **`onboarding`** — `GetOnboardingStageUseCase` offers the profile onboarding chat while `personal` is empty
- **`runs`** — `MemoryCapability` of the chat run profile loads memory, offers the tools, renders the `<memory>` block (`memory-prompt-section.ts`) and reminds the assistant to keep memory current on every fifth user message

## Boundaries

- **Behind the `memoryEnabled` feature flag.** With it off, chat runs get no tools, prompt section or reminder, and the API answers 404. There is no organization or user switch.
- **Chat runs only.** Routine and Outlook runs get no memory.
- **Anonymous runs are excluded entirely** — anonymous chats and models with enforced anonymous mode get no tools, no prompt section and no reminder. Anonymization does not cover the system prompt, so the `<memory>` block would reach the model in clear text, and PII in the conversation is replaced with per-thread `{{pii:…}}` placeholders that would be meaningless in every other thread.
- **Memory never enters the transcript.** It lives in the run instructions, which are not persisted, so sharing a thread does not expose it. A `get_memory` tool *result* is persisted like any other tool result.
- A memory read failure degrades the run to one without memory rather than failing the chat.
