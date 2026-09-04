# Workspaces Module

## Purpose

Workspaces are folders that group a user's chats. A workspace carries a name, an
optional description, appearance (icon key + colour), and optional project
instructions. It owns workspace-specific skills and knowledge bases, plus
direct workspace documents that are automatically available in every chat
filed under the workspace. User-specific favorites and their order are owned by the
`favorites` module.

User-facing copy calls them "Projekte"; the code, tables and routes say
`workspace` throughout. See AYC-700 / AYC-701 in the Workspaces/Projects plan.
Workspace skills and knowledge bases are isolated from personal resources and
must be created directly in the workspace; personal resources cannot be copied
or attached.

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
- **Owned resources** — skills and knowledge bases belong directly to the workspace through their `workspaceId`; there are no personal-resource attachment rows. Direct workspace documents remain owned uploads represented by a workspace-source assignment. Resource and workspace deletion cascades remove database state, while source cleanup passes through `DeleteSourceUseCase` so indexed data and object-storage files are purged.
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
│       ├── add-document-to-workspace/
│       ├── remove-document-from-workspace/
│       ├── update-workspace-instruction/
│       ├── build-workspace-run-context/
│       ├── list-workspace-skills/
│       ├── list-workspace-knowledge-bases/
│       ├── list-workspace-documents/
│       ├── find-all-workspaces/
│       ├── find-workspaces-by-ids/
│       ├── find-workspace/
│       ├── update-workspace/
│       ├── update-workspace-instruction/
│       ├── add-document-to-workspace/ / remove-document-from-workspace/
│       ├── build-workspace-run-context/
│       └── delete-workspace/
├── infrastructure/persistence/local/
│   ├── schema/workspace.record.ts   # table `workspaces`
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

| Method | Route                                                      | Purpose                                                |
| ------ | ---------------------------------------------------------- | ------------------------------------------------------ |
| POST   | `/workspaces`                                              | Create a workspace                                     |
| GET    | `/workspaces`                                              | List by most recently updated                          |
| GET    | `/workspaces/:id`                                          | Read one                                               |
| PATCH  | `/workspaces/:id`                                          | Update name / description / icon / colour              |
| DELETE | `/workspaces/:id`                                          | Delete the workspace and its chats                     |
| GET    | `/workspaces/:id/context`                                  | Read the full runtime context                          |
| POST   | `/workspaces/:id/context/skills`                           | Create a workspace-owned skill                         |
| GET    | `/workspaces/:id/context/skills`                           | List workspace-owned skills                            |
| DELETE | `/workspaces/:id/context/skills/:skillId`                  | Delete a workspace-owned skill                         |
| POST   | `/workspaces/:id/context/knowledge-bases`                  | Create a workspace-owned knowledge base                |
| GET    | `/workspaces/:id/context/knowledge-bases`                  | List workspace-owned knowledge bases                   |
| DELETE | `/workspaces/:id/context/knowledge-bases/:knowledgeBaseId` | Delete a workspace-owned knowledge base                |
| GET    | `/workspaces/:id/context/documents`                        | List workspace documents                               |
| POST   | `/workspaces/:id/context/documents`                        | Upload and attach a document                           |
| DELETE | `/workspaces/:id/context/documents/:documentId`            | Remove an attached document                            |
| PATCH  | `/workspaces/:id/context/instruction`                      | Update the workspace instruction                       |

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
project context into chat execution. Workspace context uses exported skills,
knowledge-bases and sources application services/use cases. TypeORM schema
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
