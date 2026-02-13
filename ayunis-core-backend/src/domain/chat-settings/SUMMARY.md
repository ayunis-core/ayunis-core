# Chat Settings Module

Per-user chat configuration. Currently contains the **user system prompt** feature — a personal system prompt that gets injected into every AI conversation.

## Domain Entities

- **`UserSystemPrompt`** — A user's custom system prompt (`id`, `userId`, `systemPrompt`, `createdAt`, `updatedAt`). One per user, upsert semantics.

## Ports

- **`UserSystemPromptsRepository`** — `findByUserId`, `upsert`, `deleteByUserId`

## Use Cases

- **`GetUserSystemPromptUseCase`** — Retrieves the user's system prompt (returns `null` if not set)
- **`UpsertUserSystemPromptUseCase`** — Creates or replaces the user's system prompt
- **`DeleteUserSystemPromptUseCase`** — Deletes the user's system prompt (idempotent)

## Infrastructure

- **`LocalUserSystemPromptsRepository`** — TypeORM implementation backed by `user_system_prompts` table
- **`UserSystemPromptRecord`** — TypeORM entity with unique index on `userId`
- **`UserSystemPromptMapper`** — Domain ↔ Record conversion

## HTTP API

Controller: `ChatSettingsController` — base path `/chat-settings`, tag `Chat Settings`

| Method | Path                          | Description                    |
| ------ | ----------------------------- | ------------------------------ |
| GET    | `/chat-settings/system-prompt` | Get user's system prompt       |
| PUT    | `/chat-settings/system-prompt` | Set/update user's system prompt |
| DELETE | `/chat-settings/system-prompt` | Delete user's system prompt    |

## Exports

- `GetUserSystemPromptUseCase` — Used by the runs module to inject user instructions into the system prompt

## Future

- `user_default_models` (currently in `models` module) is a natural candidate to migrate here.
