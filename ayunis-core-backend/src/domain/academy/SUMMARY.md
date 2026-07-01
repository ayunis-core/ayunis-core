# Academy

Platform-global learning content for the **Ayunis Core Academy** add-on
(`AddonType.AYUNIS_CORE_ACADEMY`): chapters containing video courseModules, authored
centrally by super admins. There is no org or user-facing surface yet — read
access gated by the org's add-on activation is a follow-up.

## Model

- `AcademyChapter` — `{ id, title, description, position, courseModules[] }`.
- `AcademyCourseModule` — `{ id, chapterId, title, description?, loomUrl, position }`,
  cascade-deleted with its chapter. `loomUrl` is a validated Loom share/embed
  link (`https://loom.com/(share|embed)/...`).

## Ordering

Both chapters (globally) and courseModules (per chapter) carry a 0-based `position`
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
  list (chapters with nested ordered courseModules), create, update, delete,
  reorder (`PUT chapters/order`, declared before the `:id` routes).
- `SuperAdminAcademyCourseModulesController` (`super-admin/academy`) — create
  (`POST chapters/:chapterId/course-modules`), reorder
  (`PUT chapters/:chapterId/course-modules/order`), update/delete (`courseModules/:id`).

## Layout

Standard hexagonal: `domain/` (chapter + courseModule entities), `application/`
(repository ports, use-cases, errors, reorder validation), `infrastructure/`
(Postgres records + mapper + repositories), `presenters/http/` (super-admin
controllers + DTOs + response mapper).
