# Skills Module

## Purpose

Skills are reusable knowledge + integration bundles that an AI assistant can activate on-demand during a conversation. Unlike agents, skills don't have their own model or tool assignments — they bring sources (knowledge bases) and MCP integrations that get injected into a thread when activated.

## Key Concepts

- **Skill**: A named bundle with a short description (shown in system prompt), long description (instructions, returned on activation), sources, and MCP integrations.
- **Activation**: Skills have an `isActive` boolean. Only active skills are surfaced in the system prompt as available for the LLM to activate.
- **On-demand injection**: The LLM activates a skill via the `activate_skill` tool, which injects the skill's instructions and attaches its sources/MCP integrations to the thread.
- **Name uniqueness**: Skill names must be unique per user (enforced at repository level) because the `activate_skill` tool uses the name as the identifier.

## Structure

```
skills/
├── SUMMARY.md
├── domain/
│   └── skill.entity.ts                    # Skill domain entity
├── application/
│   ├── ports/skill.repository.ts          # Abstract repository
│   ├── skills.errors.ts                   # Domain errors
│   └── use-cases/
│       ├── create-skill/
│       ├── update-skill/
│       ├── delete-skill/
│       ├── find-one-skill/
│       ├── find-all-skills/
│       ├── toggle-skill-active/
│       ├── find-active-skills/
│       ├── add-source-to-skill/
│       ├── remove-source-from-skill/
│       ├── list-skill-sources/
│       ├── assign-mcp-integration-to-skill/
│       ├── unassign-mcp-integration-from-skill/
│       └── list-skill-mcp-integrations/
├── infrastructure/
│   └── persistence/local/
│       ├── schema/skill.record.ts          # TypeORM entity (ManyToMany for sources + MCP)
│       ├── mappers/skill.mapper.ts
│       ├── local-skill.repository.ts
│       └── local-skill-repository.module.ts
├── presenters/http/
│   ├── skills.controller.ts
│   ├── dto/
│   │   ├── create-skill.dto.ts
│   │   ├── update-skill.dto.ts
│   │   └── skill-response.dto.ts
│   └── mappers/skill.mapper.ts
└── skills.module.ts
```

## Design Decisions

Both sources and MCP integrations use the same `@ManyToMany` + `@JoinTable` pattern. The domain entity stores `sourceIds: UUID[]` and `mcpIntegrationIds: UUID[]`. Full entity objects are fetched via dedicated list use cases (`ListSkillSourcesUseCase`, `ListSkillMcpIntegrationsUseCase`) that batch-fetch by IDs.

## Dependencies

- **SourcesModule** — for source management (create/delete sources, batch fetch by IDs)
- **McpModule** — for MCP integration validation and batch fetch
- **ContextService** — for user context (userId, orgId)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/skills` | Create a skill |
| GET | `/skills` | List all skills for current user |
| GET | `/skills/:id` | Get a skill by ID |
| PUT | `/skills/:id` | Update a skill |
| DELETE | `/skills/:id` | Delete a skill |
| PATCH | `/skills/:id/toggle-active` | Toggle skill active/inactive |
| GET | `/skills/:id/sources` | List sources for a skill |
| POST | `/skills/:id/sources/file` | Add a file source to a skill |
| DELETE | `/skills/:id/sources/:sourceId` | Remove a source from a skill |
| POST | `/skills/:skillId/mcp-integrations/:integrationId` | Assign MCP integration |
| DELETE | `/skills/:skillId/mcp-integrations/:integrationId` | Unassign MCP integration |
| GET | `/skills/:skillId/mcp-integrations` | List assigned MCP integrations |
