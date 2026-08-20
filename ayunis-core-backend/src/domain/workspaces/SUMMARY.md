# Workspaces Module

## Purpose

Workspaces are folders that group a user's chats. A workspace carries a name, an
optional description, appearance (icon key + colour), and optional project
instructions. It can reference global skills, knowledge bases, and direct
workspace documents that are automatically available in every chat filed under
the workspace. User-specific favorites and their order are owned by the
`favorites` module.

User-facing copy calls them "Projekte"; the code, tables and routes say
`workspace` throughout. See AYC-700 / AYC-701 in the Workspaces/Projects plan.
Workspace collaboration is being introduced in stack layers. Direct member
invitations, team grants and team-member overrides now exist at the application
boundary. Read boundaries return hydrated sharing state and the current user's
pending invitations; HTTP and frontend sharing flows follow later.

The whole module sits behind the `workspacesEnabled` feature flag
(`FEATURE_WORKSPACES_ENABLED`, off by default), applied at the controller.

## Domain Concepts

- **Workspace** — owned by exactly one user and scoped to their org. Shared
  users need `use` to read workspace metadata and attached context, and `edit`
to update it or browse attachment candidates.
- **Per-user favorite state** — owned by the favorites module; a workspace row
  carries no pin or order state. Access checks stay with the workspace use
  cases — favorites trusts its callers.
- **Appearance** — `icon` and `color` are opaque keys owned by the frontend
  catalogue. The backend only guards their shape (`WORKSPACE_ICON_PATTERN`,
  `WORKSPACE_COLOR_PATTERN`); `color` is either a palette key or a `#rrggbb`
  literal produced by the custom-colour picker.
- **Collaboration** — workspaces persist private/organization visibility.
  Direct-member use cases manage pending invitations, acceptance, roles and
  removal. Team grant use cases add, update and remove immediate team access.
  Team-scoped member overrides can replace or exclude a member's grant without
  affecting other team members; HTTP sharing endpoints follow later.
- **Deletion** — `DeleteWorkspaceUseCase` emits `WorkspaceDeletionRequestedEvent`
  _before_ the row delete and drains the listeners' deferred cleanup only after
  it succeeds, so a failed delete loses nothing. The favorites module listens
  to remove workspace favorites. The threads module deletes the workspace's
  chats via its `threads.workspaceId` FK cascade and listens to this event to
  purge their object-storage assets, which no database cascade can reach.
- **Creation** — `CreateWorkspaceUseCase` saves the workspace, then calls
  `AddFavoriteUseCase` so new workspaces appear in the user's favorites.
- **Context assignments** — workspace skills and knowledge bases are
  reference-only join rows into shared module-owned records. Attaching and
  detaching them requires `edit` plus access to the referenced resource. Direct
  workspace documents are owned uploads: adding one creates a source and a
  workspace-source assignment, while removal/deletion passes that source
  through `DeleteSourceUseCase` so indexed data and object-storage files are
  purged.
- **Run context** — `BuildWorkspaceRunContextUseCase` requires `use` access and
  resolves the workspace's instruction, skills, knowledge bases, documents and
  MCP integrations through `WorkspaceRunContextResolverService`. The
  runs module merges that context into tool assembly and the system prompt for
  chats whose `Thread.workspaceId` is set.

## Architecture

```text
workspaces/
├── domain/
│   ├── workspace.entity.ts          # identity, appearance and visibility
│   ├── workspace-run-context.entity.ts
│   ├── value-objects/               # role, visibility, membership status
│   └── workspaces.constants.ts      # limits, defaults, icon/colour patterns
├── application/
│   ├── workspaces.errors.ts
│   ├── services/workspace-access-policy.service.ts
│   ├── util/workspace-fields.ts     # field validation (name/description/appearance)
│   ├── events/
│   │   └── workspace-deletion-requested.event.ts
│   ├── services/workspace-access.service.ts
│   ├── services/workspace-run-context-resolver.service.ts
│   ├── ports/workspaces-repository.port.ts
│   ├── ports/workspace-access-repository.port.ts
│   ├── ports/workspace-members-repository.port.ts
│   ├── ports/workspace-team-grants-repository.port.ts
│   ├── ports/workspace-team-member-overrides-repository.port.ts
│   ├── ports/workspace-sharing-read-repository.port.ts
│   ├── ports/workspace-invitations-read-repository.port.ts
│   ├── testing/workspace.fixtures.ts
│   └── use-cases/
│       ├── create-workspace/
│       ├── get-workspace-access/
│       ├── invite-workspace-member/ / accept-workspace-invitation/
│       ├── decline-workspace-invitation/ / update-workspace-member-role/
│       ├── remove-workspace-member/
│       ├── add-workspace-team-grant/ / update-workspace-team-grant-role/
│       ├── remove-workspace-team-grant/
│       ├── set-workspace-team-member-override/
│       ├── reset-workspace-team-member-override/
│       ├── get-workspace-sharing/ / list-my-workspace-invitations/
│       ├── find-all-workspaces/ / find-workspaces-by-ids/ / find-workspace/
│       ├── update-workspace/ / update-workspace-instruction/
│       ├── attach-skill-to-workspace/ / detach-skill-from-workspace/
│       ├── attach-knowledge-base-to-workspace/ / detach-knowledge-base-from-workspace/
│       ├── add-document-to-workspace/ / remove-document-from-workspace/
│       ├── list-workspace-skill-candidates/ / list-workspace-skills/
│       ├── list-workspace-knowledge-base-candidates/ / list-workspace-knowledge-bases/
│       ├── list-workspace-documents/
│       ├── build-workspace-run-context/
│       └── delete-workspace/
├── infrastructure/persistence/local/
│   ├── schema/workspace.record.ts   # table `workspaces`
│   ├── schema/workspace-skill-assignment.record.ts
│   ├── schema/workspace-knowledge-base-assignment.record.ts
│   ├── schema/workspace-source-assignment.record.ts
│   ├── schema/workspace-member.record.ts
│   ├── schema/workspace-team-grant.record.ts
│   ├── schema/workspace-team-member-override.record.ts
│   ├── mappers/workspace.mapper.ts
│   ├── mappers/workspace-member.mapper.ts
│   ├── mappers/workspace-team-grant.mapper.ts
│   ├── mappers/workspace-team-member-override.mapper.ts
│   ├── mappers/workspace-sharing.mapper.ts
│   ├── mappers/workspace-invitation.mapper.ts
│   ├── local-workspaces.repository.ts
│   ├── local-workspace-access.repository.ts
│   ├── local-workspace-members.repository.ts
│   ├── local-workspace-members-repository.module.ts
│   ├── local-workspace-team-grants.repository.ts
│   ├── local-workspace-team-grants-repository.module.ts
│   ├── local-workspace-team-member-overrides.repository.ts
│   ├── local-workspace-team-member-overrides-repository.module.ts
│   ├── local-workspace-sharing-read.repository.ts
│   ├── local-workspace-sharing-read-repository.module.ts
│   ├── local-workspace-invitations-read.repository.ts
│   ├── local-workspace-invitations-read-repository.module.ts
│   └── local-workspaces-repository.module.ts
├── presenters/http/
│   ├── workspaces.controller.ts
│   ├── workspace-context.controller.ts
│   ├── dtos/
│   └── mappers/
└── workspaces.module.ts
```

## HTTP API

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/workspaces` | Create a workspace |
| GET | `/workspaces` | List by most recently updated |
| GET | `/workspaces/:id` | Read one |
| PATCH | `/workspaces/:id` | Update name / description / icon / colour |
| DELETE | `/workspaces/:id` | Delete the workspace and its chats |
| GET | `/workspaces/:id/context` | Read the full runtime context |
| GET | `/workspaces/:id/context/skill-candidates` | List accessible skills with attachment state |
| GET | `/workspaces/:id/context/knowledge-base-candidates` | List accessible knowledge bases with attachment state |
| GET | `/workspaces/:id/context/skills` | List attached skills |
| GET | `/workspaces/:id/context/knowledge-bases` | List attached knowledge bases |
| GET | `/workspaces/:id/context/documents` | List attached documents |
| POST / DELETE | `/workspaces/:id/context/skills/:skillId` | Attach or detach a skill |
| POST / DELETE | `/workspaces/:id/context/knowledge-bases/:knowledgeBaseId` | Attach or detach a knowledge base |
| POST | `/workspaces/:id/context/documents` | Upload and attach a document |
| DELETE | `/workspaces/:id/context/documents/:documentId` | Remove an attached document |
| PATCH | `/workspaces/:id/context/instruction` | Update the workspace instruction |

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

Workspace context use cases consume exported skills, knowledge-bases and
sources application use cases/services for access checks, candidate lists and
document processing. The workspace repository owns only the assignment rows;
the referenced entity modules remain responsible for entity access and
processing.

The repository ports are deliberately not exported — cross-module access goes
through exported use cases. `GetWorkspaceAccessUseCase` resolves direct,
team-derived and organization access into one effective role and is the public
authorization boundary for modules that operate on workspace children. Team
membership is resolved through `ListMyTeamsUseCase` from IAM; access persistence
never reads IAM repositories directly. Direct invitations use exported
`FindUsersByIdsUseCase` to constrain invitees to the caller's organization.

Workspace context list endpoints use dedicated paginated use cases. Candidate
and attached lists apply search, access checks, workspace assignments, ordering,
offset, limit, and total-count queries in the database. The full `/context`
endpoint remains the unpaginated runtime-context projection used when starting
or running a workspace chat.
