# Academy

Platform-global learning content for the **Ayunis Core Academy** add-on
(`AddonType.AYUNIS_CORE_ACADEMY`): chapters containing video courseModules and
quiz question pools, authored centrally by super admins. Org users read the
content, take chapter quizzes and track their progress; all user-facing routes
are gated by the org's add-on activation (`@RequireAddon`).

## Model

- `AcademyChapter` — `{ id, title, description, position, courseModules[] }`.
- `AcademyCourseModule` — `{ id, chapterId, title, description?, loomUrl, position }`,
  cascade-deleted with its chapter. `loomUrl` is a validated Loom share/embed
  link (`https://loom.com/(share|embed)/...`).
- `AcademyQuizQuestion` — `{ id, chapterId, text, options[], position }`; each
  option is `{ text, isCorrect }`, forming a per-chapter question pool.
- `AcademyChapterProgress` — one row per `(user, chapter)`, upserted on every
  attempt; `passedAt` (nullable) is the last passing timestamp, plus
  `lastScore`/`lastAttemptAt`.
- `AcademyCompletion` — one row per user, `completedAt` stamped when every
  quiz-enabled chapter is passed; never cleared by later content changes.

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

Super-admin only (`@SystemRoles(SUPER_ADMIN)`), three controllers under
`super-admin/academy`:

- `SuperAdminAcademyChaptersController` (`super-admin/academy/chapters`) —
  list (chapters with nested ordered courseModules), create, update, delete,
  reorder (`PUT chapters/order`, declared before the `:id` routes).
- `SuperAdminAcademyCourseModulesController` (`super-admin/academy`) — create
  (`POST chapters/:chapterId/course-modules`), reorder
  (`PUT chapters/:chapterId/course-modules/order`), update/delete (`course-modules/:id`).
- `SuperAdminAcademyQuizQuestionsController` (`super-admin/academy`) — create
  (`POST chapters/:chapterId/quiz-questions`), update/delete (`quiz-questions/:id`).

## Learner-facing

Org users with the add-on active (`@RequireAddon(AYUNIS_CORE_ACADEMY)`), two
controllers under `academy`:

- `AcademyChaptersController` (`academy/chapters`) — `GET` all chapters with
  nested ordered courseModules.
- `AcademyQuizController` (`academy`) — `GET chapters/:chapterId/quiz` (up to 10
  random questions, correct answers stripped), `POST chapters/:chapterId/quiz/submit`
  (grade against the pass threshold, record progress, stamp completion when the
  whole academy is passed; unlimited retries), `GET progress` (per-chapter pass
  state + completion date).

## Layout

Standard hexagonal: `domain/` (chapter, courseModule, quiz-question, chapter
progress + completion entities), `application/` (repository ports, use-cases,
errors, reorder validation), `infrastructure/` (Postgres records + mapper +
repositories), `presenters/http/` (super-admin + learner controllers + DTOs +
response mapper).
