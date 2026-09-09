# Workspaces Module

## Purpose

Workspaces are folders that group a user's chats. A workspace carries a name, an
optional description, appearance (icon key + colour), and optional project
instructions. It owns workspace-specific skills and knowledge bases. Documents
exist only inside those knowledge bases. User-specific favorites and their order
are owned by the `favorites` module.

User-facing copy calls them "Projekte"; the code, tables and routes say
`workspace` throughout. See AYC-700 / AYC-701 in the Workspaces/Projects plan.
Workspace skills and knowledge bases are isolated from personal resources and
must be created directly in the workspace; personal resources cannot be copied
or attached. Workspace-scoped detail endpoints edit those resources, restrict
skill knowledge-base assignments to the same workspace, and manage documents
inside workspace knowledge bases. Activation is a shared project setting for
skills and knowledge bases, and both start active. An enabled skill is available
for on-demand activation, not automatically applied. Inactive resources are
excluded from run context; deactivating a skill also clears its project pin.
The skill management list is ordered alphabetically (with an ID tie-breaker),
independent of activation or pinning, so changing state does not move its row.

The whole module sits behind the `workspacesEnabled` feature flag
(`FEATURE_WORKSPACES_ENABLED`, off by default), applied at the controller.

## Domain Concepts

- **Workspace** — owned by exactly one user and scoped to their org.
- **Per-user favorite state** — owned by the favorites module; a workspace row
  carries no pin or order state. Access checks stay with the workspace use
  cases — favorites trusts its callers.
- **Appearance** — `icon` and `color` are opaque keys owned by the frontend
  catalogue. The backend only guards their shape (`WORKSPACE_ICON_PATTERN`,
  `WORKSPACE_COLOR_PATTERN`); `color` is either a palette key or a `#rrggbb`
  literal produced by the custom-colour picker.
- **Deletion** — `DeleteWorkspaceUseCase` emits `WorkspaceDeletionRequestedEvent`
  _before_ the row delete and drains the listeners' deferred cleanup only after
  it succeeds, so a failed delete loses nothing. The favorites module listens
  to remove workspace favorites. The threads module deletes the workspace's
  chats via its `threads.workspaceId` FK cascade and listens to this event to
  purge their object-storage assets. The knowledge-bases module also resolves
  workspace knowledge-base sources before the cascade and defers only queued-job
  and temporary processing-file cleanup. Knowledge bases, sources, and search-index
  chunks/embeddings are deleted by database cascades. The skills module handles
  sources attached directly to workspace skills.
- **Creation** — `CreateWorkspaceUseCase` saves the workspace, then calls
  `AddFavoriteUseCase` so new workspaces appear in the user's favorites.
- **Owned resources** — skills and knowledge bases belong directly to the
  workspace through their `workspaceId`; there are no personal-resource
  attachment rows or standalone workspace documents. Documents are owned by a
  workspace knowledge base. Resource and workspace deletion cascades remove
  database state, including knowledge-base sources and their indexed data.
  Removing individual documents uses `DeleteSourceUseCase`; workspace deletion
  only schedules external processing cleanup for knowledge-base sources.
- **Run context** — `BuildWorkspaceRunContextUseCase` resolves the workspace's
  instruction, enabled skill candidates and independently enabled knowledge bases.
  Skills carry their activation and pinning state in one `WorkspaceSkillContext[]`
  collection. Only their names/descriptions are advertised initially; full
  instructions, sources and MCP integrations are not loaded into the run until
  `activate_skill` or an explicit quick action activates the skill. Both paths
  use normal thread resource attachment. Workspace instructions and independently
  enabled knowledge bases remain available without skill activation.

## Resource operation boundaries

The context and skill-source controllers call dedicated workspace use cases, not
an editor service. `WorkspaceAccessService.requireOwned` is the shared internal
caller-ownership policy. Skill operations (`GetWorkspaceSkillUseCase`,
`UpdateWorkspaceSkillUseCase`, `SetWorkspaceSkillActivationUseCase`,
`SetWorkspaceSkillPinUseCase`, `SetWorkspaceSkillKnowledgeBaseUseCase`) authorize
first, then invoke exported skill/knowledge-base use cases and return resource
state ready for DTO mapping. Assignment validates the knowledge base's workspace
before changing the skill.

Knowledge-base operations (`GetWorkspaceKnowledgeBaseUseCase`,
`UpdateWorkspaceKnowledgeBaseUseCase`, `SetWorkspaceKnowledgeBaseActivationUseCase`,
`ListWorkspaceKnowledgeBaseDocumentsUseCase`, `AddWorkspaceKnowledgeBaseDocumentUseCase`,
`RemoveWorkspaceKnowledgeBaseDocumentUseCase`) follow the same boundary. Detail
responses obtain document counts through the exported bulk-count use case rather
than loading full source entities. Skill files are orchestrated by
`ListWorkspaceSkillSourcesUseCase`, `AddWorkspaceSkillFileUseCase`, and
`RemoveWorkspaceSkillSourceUseCase`; controllers retain multipart parsing and
temporary-file cleanup only. Creation returns the initial active resource context.

Document upload validates nested-route knowledge-base membership in
`AddWorkspaceKnowledgeBaseDocumentUseCase`, then delegates the complete operation
to the shared `AddDocumentToKnowledgeBaseUseCase` in knowledge-bases. That operation
checks caller authorization via the knowledge-base write policy, which calls the
exported `AssertWorkspaceWriteAccessUseCase`; its workspace ownership policy
remains internal. The wrapper has no upload processing, capacity, or cleanup logic.

## Architecture

```text
workspaces/
├── domain/
│   ├── workspace.entity.ts          # rename/describe/restyle/instruct
│   ├── workspace-run-context.entity.ts
│   └── workspaces.constants.ts      # limits, defaults, icon/colour patterns
├── application/
│   ├── workspaces.errors.ts
│   ├── util/workspace-fields.ts     # field validation (name/description/appearance)
│   ├── events/
│   │   └── workspace-deletion-requested.event.ts
│   ├── ports/workspaces-repository.port.ts
│   ├── testing/workspace.fixtures.ts
│   └── use-cases/
│       ├── create-workspace/
│       ├── create-workspace-skill/
│       ├── create-workspace-knowledge-base/
│       ├── list-workspace-skills/
│       ├── list-workspace-knowledge-bases/
│       ├── build-workspace-run-context/
│       ├── update-workspace-instruction/
│       ├── find-all-workspaces/
│       ├── find-workspaces-by-ids/
│       ├── find-workspace/
│       ├── update-workspace/
│       └── delete-workspace/
├── infrastructure/persistence/local/
│   ├── schema/workspace.record.ts   # table `workspaces`
│   ├── mappers/workspace.mapper.ts
│   ├── local-workspaces.repository.ts
│   └── local-workspaces-repository.module.ts
├── presenters/http/
│   ├── workspaces.controller.ts
│   ├── workspace-context.controller.ts
│   ├── dtos/
│   └── mappers/
└── workspaces.module.ts
```

## HTTP API

| Method          | Route                                                                              | Purpose                                   |
| --------------- | ---------------------------------------------------------------------------------- | ----------------------------------------- |
| POST            | `/workspaces`                                                                      | Create a workspace                        |
| GET             | `/workspaces`                                                                      | List by most recently updated             |
| GET             | `/workspaces/:id`                                                                  | Read one                                  |
| PATCH           | `/workspaces/:id`                                                                  | Update name / description / icon / colour |
| DELETE          | `/workspaces/:id`                                                                  | Delete the workspace and its chats        |
| GET             | `/workspaces/:id/context`                                                          | Read the full runtime context             |
| POST            | `/workspaces/:id/context/skills`                                                   | Create a workspace-owned skill            |
| GET             | `/workspaces/:id/context/skills`                                                   | List workspace-owned skills               |
| DELETE          | `/workspaces/:id/context/skills/:skillId`                                          | Delete a workspace-owned skill            |
| GET             | `/workspaces/:id/context/skills/:skillId/sources`                                  | List skill documents                      |
| POST            | `/workspaces/:id/context/skills/:skillId/sources/file`                             | Upload a skill document                   |
| DELETE          | `/workspaces/:id/context/skills/:skillId/sources/:sourceId`                        | Remove a skill document                   |
| POST            | `/workspaces/:id/context/knowledge-bases`                                          | Create a workspace-owned knowledge base   |
| GET             | `/workspaces/:id/context/knowledge-bases`                                          | List workspace-owned knowledge bases      |
| DELETE          | `/workspaces/:id/context/knowledge-bases/:knowledgeBaseId`                         | Delete a workspace-owned knowledge base   |
| PATCH           | `/workspaces/:id/context/knowledge-bases/:knowledgeBaseId/activation`              | Set project-wide KB activation            |
| GET/POST/DELETE | `/workspaces/:id/context/knowledge-bases/:knowledgeBaseId/documents[/:documentId]` | Manage KB documents                       |
| PATCH           | `/workspaces/:id/context/instruction`                                              | Update the workspace instruction          |

## Cross-Module Boundaries

`CreateWorkspaceUseCase` imports `AddFavoriteUseCase` from the favorites module.
On deletion, the module emits `WorkspaceDeletionRequestedEvent` without
importing its consumers; `FavoritesModule`, `ThreadsModule`, and
`KnowledgeBasesModule` listen to clean up references and external assets.
`ThreadsModule` also depends on workspaces to validate a thread's `workspaceId`. In the other direction the
coupling is schema-level, not module-level: `getThreadStats` in the local
repository reads the `threads` table directly (raw SQL) to derive per-workspace
chat counts and last activity. Favorites resolves workspace
metadata through the exported, user-scoped `FindWorkspacesByIdsUseCase`.
The runs module consumes the exported `BuildWorkspaceRunContextUseCase` to merge
project context into chat execution. Workspace context uses exported skills,
knowledge-bases and sources use cases; module-local resource services are not exported. TypeORM schema
records may be referenced by the local workspace repository to resolve resources
that are directly owned by a workspace; application code does not import the
other modules' repository ports.

The repository port is deliberately not exported — cross-module access goes
through the exported use cases.

Workspace context list endpoints use dedicated paginated use cases. Resource
lists apply search, workspace ownership, ordering, offset, limit, and total-count
queries in the database. The full `/context`
endpoint remains the unpaginated runtime-context projection used when starting
or running a workspace chat.
