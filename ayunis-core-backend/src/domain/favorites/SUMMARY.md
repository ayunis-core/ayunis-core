# Favorites Module

## Purpose

Favorites are one user-owned, ordered collection of typed references. The
module keeps persistence and ordering independent of where favorites are
rendered; the current sidebar may call the interaction “pinning”.

## Domain

Each `Favorite` contains a strict `FavoriteReferenceType`, a UUID
`referenceId`, its owning user, and a non-negative position. The closed enum
currently supports workspaces and threads. Adding another target requires an
enum value plus resolver support in a later layer.

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
- **`ReorderFavoritesUseCase`** — Reorders the caller's favorites; unknown ids
  are ignored and omitted favorites keep their relative order at the end.
- **`RemoveFavoriteReferenceUseCase`** — Deletes every favorite row matching a
  reference type/id (used when a target is deleted).

## Event Listeners

- **`FavoriteWorkspaceDeletionRequestedListener`** — Removes workspace
  favorites when a workspace is deleted.

## Infrastructure

- **`LocalFavoritesRepository`** — TypeORM implementation backed by the
  `favorites` table.
- **`FavoriteRecord`** — TypeORM entity with user/reference and user/position
  uniqueness; `@Check` enforces non-negative positions.
- **`FavoriteMapper`** — Domain ↔ Record conversion.

## Exports

- `AddFavoriteUseCase`, `ReorderFavoritesUseCase`,
  `RemoveFavoriteReferenceUseCase`
