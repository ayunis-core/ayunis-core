# Memory Module

Per-user key/value store of text snippets that the assistant reads on every run and writes during a conversation, so stable facts about a user survive across threads.

Two keys are reserved: **`personal`** (who the user is — role, department, organization, responsibilities) and **`preferences`** (how they want to be served — tone, form of address, output formats). The runs module renders both in full in the system prompt; every other key is listed by name only and is pulled in on demand via the `get_memory` tool. Reserved keys are *virtual*: no row exists until the assistant writes one, so "always present" means always described in the prompt and always listed in the API response.

Memory is strictly personal. Every use case derives the owner from the request context, so no API shape can address another user's memory.

## Domain

- **`MemoryEntry`** — One snippet (`id`, `userId`, `key`, `content`, `createdAt`, `updatedAt`). Unique per (`userId`, `key`).
- **`memory.constants.ts`** — `RESERVED_MEMORY_KEYS`, key validation (`^[a-z][a-z0-9_]*$`, ≤ 48 chars), and the bounds that keep the system prompt finite: ≤ 2,000 characters per entry, ≤ 50 entries per user.

## Ports

- **`MemoryRepository`** — `findAllByUserId`, `findByUserIdAndKey`, `upsert`, `deleteByUserIdAndKey`, `deleteAllByUserId`, `countByUserId`

## Use Cases

- **`FindUserMemoryUseCase`** — All entries of the authenticated user
- **`GetMemoryEntryUseCase`** — One entry by key (`null` when absent)
- **`UpsertMemoryEntryUseCase`** — Creates or replaces an entry; enforces key shape, content length and the entry limit
- **`DeleteMemoryEntryUseCase`** — Removes an entry (idempotent). A reserved key is cleared rather than removed, because the key itself always stays available
- **`ClearUserMemoryUseCase`** — Removes every entry of the authenticated user

## Infrastructure

- **`LocalMemoryRepository`** — TypeORM implementation backed by `user_memory_entries`. `upsert` is a single `INSERT … ON CONFLICT DO UPDATE` touching only `content` and `updatedAt`, so the settings page and a tool call cannot lose each other's write.
- **`MemoryEntryRecord`** — Unique constraint on (`userId`, `key`) and FK to `users` with cascade delete, which is what makes account deletion erase memory.

## HTTP API

Controller: `MemoryController`, base path `/memory`, tag `Memory`

| Method | Path            | Description                                                     |
| ------ | --------------- | --------------------------------------------------------------- |
| GET    | `/memory`       | List the user's memory; reserved keys always included, first     |
| PUT    | `/memory/:key`  | Create or replace one entry                                      |
| DELETE | `/memory/:key`  | Delete one entry (clear, for a reserved key)                     |
| DELETE | `/memory`       | Delete the user's whole memory                                   |

## Exports

- `FindUserMemoryUseCase` — runs module: loads the snapshot for the system prompt; tools module: lists available keys on a `get_memory` miss
- `GetMemoryEntryUseCase` — tools module: backs `get_memory`
- `UpsertMemoryEntryUseCase` / `DeleteMemoryEntryUseCase` — tools module: back `set_memory` (empty content removes)

## Consumers

- **`tools`** — `GetMemoryTool` / `SetMemoryTool` and their handlers
- **`runs`** — `ToolAssemblyService` loads memory and offers the tools; `system-prompt-memory-section.ts` renders the `<memory>` block; `MemoryNudgeHookFactory` reminds the assistant to keep memory current on every fifth user message

## Boundaries

- **Anonymous threads are excluded entirely** — no tools, no prompt section, no nudge. PII there is replaced with per-thread `{{pii:…}}` placeholders, so anything written to memory would be meaningless in every other thread.
- **Memory never enters the transcript.** It lives in the run instructions, which are not persisted, so sharing a thread does not expose it. A `get_memory` tool *result* is persisted like any other tool result.
- A memory read failure degrades the run to one without memory rather than failing the chat.
