# Workspaces Module

## Purpose

Workspaces are folders that group a user's chats. A workspace carries a name, an
optional description, appearance (icon key + colour), and optional project
instructions. It owns workspace-specific skills and knowledge bases. Documents
exist only inside those knowledge bases. User-specific favorites and their order
are owned by the `favorites` module.

User-facing German copy calls them "Arbeitsbereiche"; the code, tables and routes say
`workspace` throughout. See AYC-700 / AYC-701 in the Workspaces/Projects plan.
Workspace skills and knowledge bases are isolated from personal resources and
must be created directly in the workspace; personal resources cannot be copied
or attached. The canonical `/knowledge-bases` API manages those resources. Workspace routes retain only skill-to-knowledge-base assignment and strictly match persisted knowledge-base ownership to the skill workspace. Activation is a shared project setting for
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
- **Run context** — `GetWorkspaceAiContextUseCase` resolves the workspace's
  instruction, enabled skill candidates, independently enabled knowledge bases,
  and document counts. `BuildWorkspaceRunContextUseCase` reuses that context for
  inference.
  Skills carry their activation and pinning state in one `WorkspaceSkillContext[]`
  collection. Only their names/descriptions are advertised initially; full
  instructions, sources and MCP integrations are not loaded into the run until
  `activate_skill` or an explicit quick action activates the skill. Both paths
  use normal thread resource attachment. Workspace instructions and independently
  enabled knowledge bases remain available without skill activation.

## Resource operation boundaries

The context and skill-source controllers call dedicated workspace use cases, not
an editor service. `AssertWorkspaceReadAccessUseCase`,
`AssertWorkspaceWriteAccessUseCase`, and `AssertWorkspaceExecutionAccessUseCase`
are the exported capability boundary over the internal owner policy. The execution
capability resolves the thread under the authenticated principal and requires its
persisted `workspaceId` to match; callers cannot establish trust with a raw
workspace ID. Skill operations (`GetWorkspaceSkillUseCase`,
`UpdateWorkspaceSkillUseCase`, `SetWorkspaceSkillActivationUseCase`,
`SetWorkspaceSkillPinUseCase`, `SetWorkspaceSkillKnowledgeBaseUseCase`) authorize
first, then invoke exported skill/knowledge-base use cases and return resource
state ready for DTO mapping. Assignment validates the knowledge base's workspace
before changing the skill.

Workspace knowledge-base resources are managed by the canonical knowledge-bases application and HTTP boundaries. The workspace module keeps no duplicate CRUD, activation, list, or document wrappers and exposes no nested knowledge-base resource routes. `SetWorkspaceSkillKnowledgeBaseUseCase` authorizes workspace writes, resolves the knowledge base through canonical `FindKnowledgeBaseUseCase`, and rejects personal or different-workspace ownership before mutation.

Skill files are orchestrated by `ListWorkspaceSkillSourcesUseCase`, `AddWorkspaceSkillFileUseCase`, and `RemoveWorkspaceSkillSourceUseCase`; controllers retain multipart parsing and temporary-file cleanup only.

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
│       ├── list-workspace-skills/
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

| Method | Route                                                       | Purpose                                   |
| ------ | ----------------------------------------------------------- | ----------------------------------------- |
| POST   | `/workspaces`                                               | Create a workspace                        |
| GET    | `/workspaces`                                               | List by most recently updated             |
| GET    | `/workspaces/:id`                                           | Read one                                  |
| PATCH  | `/workspaces/:id`                                           | Update name / description / icon / colour |
| DELETE | `/workspaces/:id`                                           | Delete the workspace and its chats        |
| GET    | `/workspaces/:id/context`                                   | Read the full runtime context             |
| POST   | `/workspaces/:id/context/skills`                            | Create a workspace-owned skill            |
| GET    | `/workspaces/:id/context/skills`                            | List workspace-owned skills               |
| DELETE | `/workspaces/:id/context/skills/:skillId`                   | Delete a workspace-owned skill            |
| GET    | `/workspaces/:id/context/skills/:skillId/sources`           | List skill documents                      |
| POST   | `/workspaces/:id/context/skills/:skillId/sources/file`      | Upload a skill document                   |
| DELETE | `/workspaces/:id/context/skills/:skillId/sources/:sourceId` | Remove a skill document                   |
| PATCH  | `/workspaces/:id/context/instruction`                       | Update the workspace instruction          |

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

The repository port and `WorkspaceAccessService` are deliberately not exported —
cross-module access goes through the exported read, write, and trusted-execution
use cases. Threads and artifacts use the read capability; knowledge bases and
skills dispatch workspace-owned resource authorization to the appropriate
capability. Trusted execution resolves an owner-scoped thread through the threads
module, which forms an explicit `forwardRef` module relationship without exposing
either module's repository.

The workspace skill list uses its dedicated paginated use case. Knowledge-base listing lives in the canonical knowledge-bases module. The full `/context`
endpoint remains the unpaginated runtime-context projection used when starting
or running a workspace chat.
