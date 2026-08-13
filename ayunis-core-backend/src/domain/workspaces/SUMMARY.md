# Workspaces Module

## Purpose

Workspaces are folders that group a user's chats. A workspace carries a name, an
optional description and an appearance (icon key + colour). User-specific
favorites and their order are owned by the `favorites` module.

User-facing copy calls them "Projekte"; the code, tables and routes say
`workspace` throughout. See AYC-700 (iteration 1 of the Workspaces/Projects
plan) — sharing, skills, knowledge and retention settings arrive in later
iterations.

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
  *before* the row delete and drains the listeners' deferred cleanup only after
  it succeeds, so a failed delete loses nothing. The favorites module listens
  to remove workspace favorites; the threads integration that deletes a
  workspace's chats (and purges their object-storage assets, which no database
  cascade can reach) arrives with the threads module changes.
- **Creation** — `CreateWorkspaceUseCase` saves the workspace, then calls
  `AddFavoriteUseCase` so new workspaces appear in the user's favorites.

## Architecture

```text
workspaces/
├── domain/
│   ├── workspace.entity.ts          # rename/describe/restyle
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
│   ├── dtos/
│   └── mappers/workspace-dto.mapper.ts
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

## Cross-Module Boundaries

`CreateWorkspaceUseCase` imports `AddFavoriteUseCase` from the favorites module.
On deletion, the module emits `WorkspaceDeletionRequestedEvent` without
importing favorites; `FavoritesModule` listens to clean up references.
`ThreadsModule` may depend on workspaces to validate a thread's `workspaceId`
and listen for `WorkspaceDeletionRequestedEvent`.

The repository port is deliberately not exported — cross-module access goes
through the exported use cases.
