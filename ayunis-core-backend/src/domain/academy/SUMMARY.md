# Academy

Platform-global learning content for the **Ayunis Core Academy** add-on
(`AddonType.AYUNIS_CORE_ACADEMY`): chapters containing video lessons, authored
centrally by super admins. There is no org or user-facing surface yet — read
access gated by the org's add-on activation is a follow-up.

## Model

- `AcademyChapter` — `{ id, title, description, position, lessons[] }`.
- `AcademyLesson` — `{ id, chapterId, title, description?, loomUrl, position }`,
  cascade-deleted with its chapter. `loomUrl` is a validated Loom share/embed
  link (`https://loom.com/(share|embed)/...`).

## Ordering

Both chapters (globally) and lessons (per chapter) carry a 0-based `position`
and are freely sortable:

- Creates append at `max(position) + 1`; reads order by
  `position ASC, createdAt ASC`.
- Reorder use cases require the submitted ids to be exactly the current set
  (set equality, validated via `reorder-validation.ts`) and rewrite positions
  `0..n-1` in a single transaction. Mismatches throw `InvalidReorderError`
  (400) with `missing`/`extra` metadata.
- Concurrent reorders are last-write-wins (acceptable for a super-admin-only
  surface).

## Management

Super-admin only (`@SystemRoles(SUPER_ADMIN)`), two controllers under
`super-admin/academy`:

- `SuperAdminAcademyChaptersController` (`super-admin/academy/chapters`) —
  list (chapters with nested ordered lessons), create, update, delete,
  reorder (`PUT chapters/order`, declared before the `:id` routes).
- `SuperAdminAcademyLessonsController` (`super-admin/academy`) — create
  (`POST chapters/:chapterId/lessons`), reorder
  (`PUT chapters/:chapterId/lessons/order`), update/delete (`lessons/:id`).

## Layout

Standard hexagonal: `domain/` (chapter + lesson entities), `application/`
(repository ports, use-cases, errors, reorder validation), `infrastructure/`
(Postgres records + mapper + repositories), `presenters/http/` (super-admin
controllers + DTOs + response mapper).
