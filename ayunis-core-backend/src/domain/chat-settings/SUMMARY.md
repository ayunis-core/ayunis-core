# Chat Settings Module

Chat configuration at user and organization scope. Contains the **user system prompt** feature — a personal system prompt that gets injected into every AI conversation — and the **org system prompt** feature — an organization-wide system prompt set by org admins and injected into all conversations of the org's users.

## Domain Entities

- **`UserSystemPrompt`** — A user's custom system prompt (`id`, `userId`, `systemPrompt`, `createdAt`, `updatedAt`). One per user, upsert semantics.
- **`OrgSystemPrompt`** — An organization-wide system prompt (`id`, `orgId`, `systemPrompt`, `createdAt`, `updatedAt`). One per org, upsert semantics.

## Ports

- **`UserSystemPromptsRepository`** — `findByUserId`, `upsert`, `deleteByUserId`
- **`OrgSystemPromptsRepository`** — `findByOrgId`, `upsert`, `deleteByOrgId`

## Use Cases

- **`GetUserSystemPromptUseCase`** — Retrieves the user's system prompt (returns `null` if not set)
- **`UpsertUserSystemPromptUseCase`** — Creates or replaces the user's system prompt
- **`DeleteUserSystemPromptUseCase`** — Deletes the user's system prompt (idempotent)
- **`GetOrgSystemPromptUseCase`** — Retrieves the org's system prompt for the current org from context (returns `null` if not set)
- **`UpsertOrgSystemPromptUseCase`** — Creates or replaces the org's system prompt
- **`DeleteOrgSystemPromptUseCase`** — Deletes the org's system prompt (idempotent)
- **`GeneratePersonalizedSystemPromptUseCase`** — Generates a personalized system prompt and welcome message via LLM inference based on user preferences, then upserts the generated system prompt

## Infrastructure

- **`LocalUserSystemPromptsRepository`** — TypeORM implementation backed by `user_system_prompts` table
- **`UserSystemPromptRecord`** — TypeORM entity with unique index on `userId`
- **`UserSystemPromptMapper`** — Domain ↔ Record conversion
- **`LocalOrgSystemPromptsRepository`** — TypeORM implementation backed by `org_system_prompts` table
- **`OrgSystemPromptRecord`** — TypeORM entity with unique index on `orgId` and FK to `orgs` (cascade delete)
- **`OrgSystemPromptMapper`** — Domain ↔ Record conversion

## HTTP API

Controllers: `ChatSettingsController` (user self-service) and `OrgSystemPromptController` (admin-only org routes) — both base path `/chat-settings`, tag `Chat Settings`

| Method | Path                                                  | Description                                              |
| ------ | ----------------------------------------------------- | -------------------------------------------------------- |
| GET    | `/chat-settings/system-prompt`                        | Get user's system prompt                                 |
| PUT    | `/chat-settings/system-prompt`                        | Set/update user's system prompt                          |
| DELETE | `/chat-settings/system-prompt`                        | Delete user's system prompt                              |
| GET    | `/chat-settings/org-system-prompt`                    | Get org-wide system prompt (org admin only)              |
| PUT    | `/chat-settings/org-system-prompt`                    | Set/update org-wide system prompt (org admin only)       |
| DELETE | `/chat-settings/org-system-prompt`                    | Delete org-wide system prompt (org admin only)           |
| POST   | `/chat-settings/generate-personalized-system-prompt`  | Generate and save a personalized system prompt           |

## Exports

- `GetUserSystemPromptUseCase` — Used by the runs module to inject user instructions into the system prompt
- `GetOrgSystemPromptUseCase` — Used by the runs module to inject organization instructions into the system prompt

## Future

- `user_default_models` (currently in `models` module) is a natural candidate to migrate here.
