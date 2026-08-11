# Favorites Module

## Purpose

Favorites are one user-owned, ordered collection of typed references. The
module keeps persistence and ordering independent of where favorites are
rendered; the current sidebar may call the interaction “pinning”.

## Domain

Each `Favorite` contains a strict `FavoriteReferenceType`, a UUID
`referenceId`, its owning user, and a non-negative position. The closed enum
currently supports workspaces and threads. Adding another target requires an
enum value plus resolver support in this module.

The database intentionally has no foreign key from `referenceId`: one column
can reference multiple target tables. A user/reference uniqueness constraint
prevents duplicate favorites, and a user/position constraint protects order.

## Ports

- **`FavoritesRepository`** — `findAllByUserId`, `append`, `remove`,
  `removeByReference`, `reorder`. `append` assigns the end position atomically
  inside the insert and treats an already-favorited reference as a no-op;
  two concurrent appends can still race to the same position, which surfaces
  as a user/position unique violation and is retried with a bounded number
  of attempts.

## Use Cases

- **`AddFavoriteUseCase`** — Appends a favorite for a user; adding an existing
  reference is a no-op. Callers own access checks.
- **`FindFavoritesUseCase`** — Reads the caller's favorites and resolves each
  reference into display metadata.
- **`ToggleFavoriteUseCase`** — Favorites or unfavorites an owned target;
  unfavoriting compacts order.
- **`ReorderFavoritesUseCase`** — Reorders the caller's favorites; unknown ids
  are ignored and omitted favorites keep their relative order at the end.
- **`RemoveFavoriteReferenceUseCase`** — Deletes every favorite row matching a
  reference type/id (used when a target is deleted).

## Application Services

- **`FavoriteReferenceResolver`** — Validates ownership and maps favorites to
  workspace or thread display fields.

## Event Listeners

- **`FavoriteThreadDeletionRequestedListener`** — Removes thread favorites
  when `DeleteThreadUseCase` emits `ThreadDeletionRequestedEvent`.
- **`FavoriteWorkspaceDeletionRequestedListener`** — Removes workspace
  favorites when a workspace is deleted. Thread favorites for chats removed
  by the workspace cascade are cleaned up by the threads module's
  `ThreadsWorkspaceDeletionRequestedListener` instead, because cascade deletes
  never emit `ThreadDeletionRequestedEvent`.

## Infrastructure

- **`LocalFavoritesRepository`** — TypeORM implementation backed by the
  `favorites` table.
- **`FavoriteRecord`** — TypeORM entity with user/reference and user/position
  uniqueness; `@Check` enforces non-negative positions.
- **`FavoriteMapper`** — Domain ↔ Record conversion.

## HTTP API

`FavoritesController` — base path `/favorites`, tag `favorites`. Gated with
`@RequireFeature(FeatureFlag.Workspaces)` like the workspaces API, since
favorites currently only surface workspace/thread pinning.

| Method | Path                 | Purpose                                   |
| ------ | -------------------- | ----------------------------------------- |
| GET    | `/favorites`         | Read resolved favorites in personal order |
| PATCH  | `/favorites/toggle`  | Favorite or unfavorite an owned target    |
| PATCH  | `/favorites/reorder` | Reorder the caller's favorites            |

The response is discriminated by `referenceType`. Workspace favorites include
name, icon, and color; thread favorites include their nullable name and
workspace id so consumers do not need one detail request per favorite.

## Exports

- `AddFavoriteUseCase`, `FindFavoritesUseCase`, `ToggleFavoriteUseCase`,
  `ReorderFavoritesUseCase`, `RemoveFavoriteReferenceUseCase`

## Dependencies

- **workspaces** — ownership checks and workspace display metadata.
- **threads** — ownership checks and thread display metadata.
