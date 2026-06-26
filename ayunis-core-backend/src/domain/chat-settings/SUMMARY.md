# Chat Settings Module

Chat configuration at user and organization scope. Contains the **user system prompt** feature — a personal system prompt that gets injected into every AI conversation — the **org system prompt** feature — an organization-wide system prompt set by org admins and injected into all conversations of the org's users — and **org chat settings**, an organization-wide toggle that controls whether internet access (web search + website content tools) is offered to the AI assistant.

## Domain Entities

- **`UserSystemPrompt`** — A user's custom system prompt (`id`, `userId`, `systemPrompt`, `createdAt`, `updatedAt`). One per user, upsert semantics.
- **`OrgSystemPrompt`** — An organization-wide system prompt (`id`, `orgId`, `systemPrompt`, `createdAt`, `updatedAt`). One per org, upsert semantics.
- **`OrgChatSettings`** — Organization-wide chat configuration (`id`, `orgId`, `internetSearchEnabled`, `createdAt`, `updatedAt`). One per org, upsert semantics. `internetSearchEnabled` defaults to `true` (internet access on); when `false`, the runs module omits the web search and website content tools from all of the org's conversations.

## Ports

- **`UserSystemPromptsRepository`** — `findByUserId`, `upsert`, `deleteByUserId`
- **`OrgSystemPromptsRepository`** — `findByOrgId`, `upsert`, `deleteByOrgId`
- **`OrgChatSettingsRepository`** — `findByOrgId`, `upsert`

## Use Cases

- **`GetUserSystemPromptUseCase`** — Retrieves the user's system prompt (returns `null` if not set)
- **`UpsertUserSystemPromptUseCase`** — Creates or replaces the user's system prompt
- **`DeleteUserSystemPromptUseCase`** — Deletes the user's system prompt (idempotent)
- **`GetOrgSystemPromptUseCase`** — Retrieves the org's system prompt for the current org from context (returns `null` if not set)
- **`UpsertOrgSystemPromptUseCase`** — Creates or replaces the org's system prompt
- **`DeleteOrgSystemPromptUseCase`** — Deletes the org's system prompt (idempotent)
- **`GetOrgChatSettingsUseCase`** — Retrieves the org chat settings for the current org from context; returns a default (internet access enabled) entity when nothing is stored
- **`UpsertOrgChatSettingsUseCase`** — Creates or replaces the org chat settings (internet access toggle)
- **`GeneratePersonalizedSystemPromptUseCase`** — Generates a personalized system prompt and welcome message via LLM inference based on user preferences, then upserts the generated system prompt

## Infrastructure

- **`LocalUserSystemPromptsRepository`** — TypeORM implementation backed by `user_system_prompts` table
- **`UserSystemPromptRecord`** — TypeORM entity with unique index on `userId`
- **`UserSystemPromptMapper`** — Domain ↔ Record conversion
- **`LocalOrgSystemPromptsRepository`** — TypeORM implementation backed by `org_system_prompts` table
- **`OrgSystemPromptRecord`** — TypeORM entity with unique index on `orgId` and FK to `orgs` (cascade delete)
- **`OrgSystemPromptMapper`** — Domain ↔ Record conversion
- **`LocalOrgChatSettingsRepository`** — TypeORM implementation backed by `org_chat_settings` table
- **`OrgChatSettingsRecord`** — TypeORM entity with unique index on `orgId` and FK to `orgs` (cascade delete)
- **`OrgChatSettingsMapper`** — Domain ↔ Record conversion

## HTTP API

Controllers: `ChatSettingsController` (user self-service), `OrgSystemPromptController` and `OrgChatSettingsController` (admin-only org routes) — all base path `/chat-settings`, tag `Chat Settings`

| Method | Path                                                  | Description                                              |
| ------ | ----------------------------------------------------- | -------------------------------------------------------- |
| GET    | `/chat-settings/system-prompt`                        | Get user's system prompt                                 |
| PUT    | `/chat-settings/system-prompt`                        | Set/update user's system prompt                          |
| DELETE | `/chat-settings/system-prompt`                        | Delete user's system prompt                              |
| GET    | `/chat-settings/org-system-prompt`                    | Get org-wide system prompt (org admin only)              |
| PUT    | `/chat-settings/org-system-prompt`                    | Set/update org-wide system prompt (org admin only)       |
| DELETE | `/chat-settings/org-system-prompt`                    | Delete org-wide system prompt (org admin only)           |
| GET    | `/chat-settings/org-chat-settings`                    | Get org-wide chat settings (org admin only)              |
| PUT    | `/chat-settings/org-chat-settings`                    | Set/update org-wide chat settings (org admin only)       |
| POST   | `/chat-settings/generate-personalized-system-prompt`  | Generate and save a personalized system prompt           |

## Exports

- `GetUserSystemPromptUseCase` — Used by the runs module to inject user instructions into the system prompt
- `GetOrgSystemPromptUseCase` — Used by the runs module to inject organization instructions into the system prompt
- `GetOrgChatSettingsUseCase` — Used by the runs module to decide whether internet access (web search + website content) tools are offered

## Future

- `user_default_models` (currently in `models` module) is a natural candidate to migrate here.
