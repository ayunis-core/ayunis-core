# Workspaces Module

## Purpose

Workspaces are folders that group a user's chats. A workspace carries a name, an
optional description and an appearance (icon key + colour), can be pinned to the
sidebar, and holds a manual position in that sidebar list.

User-facing copy calls them "Projekte"; the code, tables and routes say
`workspace` throughout. See AYC-700 (iteration 1 of the Workspaces/Projects
plan) — sharing, skills, knowledge and retention settings arrive in later
iterations.

The whole module sits behind the `workspacesEnabled` feature flag
(`FEATURE_WORKSPACES_ENABLED`, off by default), applied at the controller.

## Domain Concepts

- **Workspace** — owned by exactly one user and scoped to their org. `isPinned`
  controls sidebar visibility; `sortOrder` is the manual position within it.
  Both are deliberately kept out of `updatedAt`'s reach so pinning and dragging
  do not reshuffle the "last updated" sort on the list page.
- **Appearance** — `icon` and `color` are opaque keys owned by the frontend
  catalogue. The backend only guards their shape (`WORKSPACE_ICON_PATTERN`,
  `WORKSPACE_COLOR_PATTERN`); `color` is either a palette key or a `#rrggbb`
  literal produced by the custom-colour picker.
- **Deletion** — `DeleteWorkspaceUseCase` emits `WorkspaceDeletionRequestedEvent`
  *before* the row delete and drains the listeners' deferred cleanup only after
  it succeeds, so a failed delete loses nothing. The threads module deletes
  the workspace's chats via its `threads.workspaceId` FK cascade and listens
  to this event to purge their object-storage assets, which no database
  cascade can reach.

## Architecture

```text
workspaces/
├── domain/
│   ├── workspace.entity.ts          # name invariants, rename/describe/restyle
│   ├── workspace.errors.ts          # InvalidWorkspaceNameError (400)
│   └── workspaces.constants.ts      # limits, defaults, icon/colour patterns
├── application/
│   ├── workspaces.errors.ts
│   ├── events/workspace-deletion-requested.event.ts
│   ├── ports/workspaces-repository.port.ts
│   ├── testing/workspace.fixtures.ts
│   └── use-cases/
│       ├── create-workspace/
│       ├── find-all-workspaces/
│       ├── find-workspace/
│       ├── update-workspace/
│       ├── delete-workspace/
│       ├── toggle-workspace-pinned/
│       └── reorder-workspaces/
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
| POST | `/workspaces` | Create (pinned, appended to the manual order) |
| GET | `/workspaces` | List in manual order |
| GET | `/workspaces/:id` | Read one |
| PATCH | `/workspaces/reorder` | Set the manual order — declared before `:id` |
| PATCH | `/workspaces/:id` | Update name / description / icon / colour |
| PATCH | `/workspaces/:id/toggle-pinned` | Pin or unpin |
| DELETE | `/workspaces/:id` | Delete the workspace and its chats |

## Cross-Module Boundaries

This module has no outgoing dependencies on other domain modules, and must keep
it that way: `ThreadsModule` is the one that will depend on *this* module, to
validate a thread's `workspaceId` through the exported `FindWorkspaceUseCase`
and to listen for `WorkspaceDeletionRequestedEvent`. Importing anything from
threads here would close that loop and fail `madge` and dependency-cruiser.

The repository port is deliberately not exported — cross-module access goes
through the exported use cases.
