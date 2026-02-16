Resource Sharing
Share agents and skills across organizations and teams

Shares enable users to publish owned resources (agents, skills) to scoped audiences within their organization or team, allowing colleagues to discover and use shared AI configurations.

The shares module implements a generic sharing system for platform resources. The abstract `Share` entity specializes into `AgentShare` and `SkillShare`, each linked to a `ShareScope` (organization or team level). Key use cases include creating shares with scope validation, deleting shares, finding shares by entity or scope, and listing all shares for a user. The `ShareAuthorizationFactory` delegates ownership verification to entity-specific strategies (e.g., `AgentShareAuthorizationStrategy`, `SkillShareAuthorizationStrategy`), ensuring users can only share resources they own. The module integrates with **agents** which registers its authorization strategy and whose entities can be shared, **skills** which registers `SkillShareAuthorizationStrategy` and whose skill entities can be shared, and the **IAM** bounded context for organization membership and role verification during scope validation.

## Supported Entity Types

- `AGENT` — Share agents via `AgentShare` entity
- `SKILL` — Share skills via `SkillShare` entity

## Exports

- `SharesRepository` — Repository port for querying shares (used by other modules for share existence checks)
- `CreateShareUseCase` — Create new shares
- `DeleteShareUseCase` — Delete shares (emits `ShareDeletedEvent` for cleanup)
- `FindSharesByScopeUseCase` — Query shares by scope
- `FindShareByEntityUseCase` — Find share for a specific entity
