# Workspaces Module

## Purpose

Workspaces are folders that group a user's chats. A workspace carries a name, an
optional description, appearance (icon key + colour), and optional project
instructions. It can reference global skills, knowledge bases, and direct
workspace documents that are automatically available in every chat filed under
the workspace. User-specific favorites and their order are owned by the
`favorites` module.

User-facing copy calls them "Projekte"; the code, tables and routes say
`workspace` throughout. See AYC-700 / AYC-701 in the Workspaces/Projects plan —
sharing and retention settings arrive in later iterations.

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
  purge their object-storage assets, which no database cascade can reach.
- **Creation** — `CreateWorkspaceUseCase` saves the workspace, then calls
  `AddFavoriteUseCase` so new workspaces appear in the user's favorites.
- **Context assignments** — workspace skills and knowledge bases are reference-only join rows into shared module-owned records. Direct workspace documents are owned uploads: adding one creates a source and a workspace-source assignment, while removal/deletion passes that source through `DeleteSourceUseCase` so indexed data and object-storage files are purged.
- **Run context** — `BuildWorkspaceRunContextUseCase` resolves the workspace's
  instruction, skills, knowledge bases, documents and MCP integrations. The
  runs module merges that context into tool assembly and the system prompt for
  chats whose `Thread.workspaceId` is set.

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
│       ├── find-all-workspaces/
│       ├── find-workspaces-by-ids/
│       ├── find-workspace/
│       ├── update-workspace/
│       ├── update-workspace-instruction/
│       ├── attach-skill-to-workspace/ / detach-skill-from-workspace/
│       ├── attach-knowledge-base-to-workspace/ / detach-knowledge-base-from-workspace/
│       ├── add-document-to-workspace/ / remove-document-from-workspace/
│       ├── list-workspace-*-candidates/
│       ├── build-workspace-run-context/
│       └── delete-workspace/
├── infrastructure/persistence/local/
│   ├── schema/workspace.record.ts   # table `workspaces`
│   ├── schema/workspace-skill-assignment.record.ts
│   ├── schema/workspace-knowledge-base-assignment.record.ts
│   ├── schema/workspace-source-assignment.record.ts
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

| Method | Route                                                      | Purpose                                      |
| ------ | ---------------------------------------------------------- | -------------------------------------------- |
| POST   | `/workspaces`                                              | Create a workspace                           |
| GET    | `/workspaces`                                              | List by most recently updated                |
| GET    | `/workspaces/:id`                                          | Read one                                     |
| PATCH  | `/workspaces/:id`                                          | Update name / description / icon / colour    |
| DELETE | `/workspaces/:id`                                          | Delete the workspace and its chats           |
| GET    | `/workspaces/:id/context`                                  | Resolve workspace skills/knowledge/documents |
| PATCH  | `/workspaces/:id/context/instruction`                      | Update project instructions                  |
| GET    | `/workspaces/:id/context/skill-candidates`                 | List attachable skills                       |
| POST   | `/workspaces/:id/context/skills/:skillId`                  | Attach a skill                               |
| DELETE | `/workspaces/:id/context/skills/:skillId`                  | Detach a skill                               |
| GET    | `/workspaces/:id/context/knowledge-base-candidates`        | List attachable knowledge bases              |
| POST   | `/workspaces/:id/context/knowledge-bases/:knowledgeBaseId` | Attach a knowledge base                      |
| DELETE | `/workspaces/:id/context/knowledge-bases/:knowledgeBaseId` | Detach a knowledge base                      |
| POST   | `/workspaces/:id/context/documents`                        | Upload a workspace document                  |
| DELETE | `/workspaces/:id/context/documents/:documentId`            | Remove a workspace document                  |

## Cross-Module Boundaries

`CreateWorkspaceUseCase` imports `AddFavoriteUseCase` from the favorites module.
On deletion, the module emits `WorkspaceDeletionRequestedEvent` without
importing favorites; `FavoritesModule` listens to clean up references.
`ThreadsModule` depends on workspaces to validate a thread's `workspaceId`
and listen for `WorkspaceDeletionRequestedEvent`. In the other direction the
coupling is schema-level, not module-level: `getThreadStats` in the local
repository reads the `threads` table directly (raw SQL) to derive per-workspace
chat counts and last activity. Favorites resolves workspace
metadata through the exported, user-scoped `FindWorkspacesByIdsUseCase`.
The runs module consumes the exported `BuildWorkspaceRunContextUseCase` to merge
project context into chat execution. Assignment validation uses exported skills,
knowledge-bases and sources application services/use cases.

The repository port is deliberately not exported — cross-module access goes
through the exported use cases.
