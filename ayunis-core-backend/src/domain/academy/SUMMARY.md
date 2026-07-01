# Academy

Platform-global learning content for the **Ayunis Core Academy** add-on
(`AddonType.AYUNIS_CORE_ACADEMY`): chapters containing video courseModules and
per-chapter quizzes, authored centrally by super admins. Learners in orgs with
the add-on active read the content, take quizzes, and accumulate per-chapter
and whole-academy completion.

## Model

- `AcademyChapter` — `{ id, title, description, position, quizEnabled,
  passThreshold, courseModules[] }`. `passThreshold` is the percent of asked
  questions that must be answered correctly (default 80).
- `AcademyCourseModule` — `{ id, chapterId, title, description?, loomUrl, position }`,
  cascade-deleted with its chapter. `loomUrl` is a validated Loom share/embed
  link (`https://loom.com/(share|embed)/...`).
- `AcademyQuizQuestion` — `{ id, chapterId, text, position, options[] }`, the
  chapter's question pool; each option carries `text` + `isCorrect`,
  cascade-deleted with its chapter.
- `AcademyChapterProgress` — one row per `(user, chapter)`, upserted on every
  attempt. `passedAt` is the most recent passing attempt and is never cleared
  by a later failing attempt; `lastScore`/`lastAttemptAt` track the latest try.
- `AcademyCompletion` — one row per user; `completedAt` is stamped/refreshed
  when every currently quiz-enabled chapter is passed and is never revoked by
  later content changes.

## Quiz mechanics

- A quiz attempt draws `DRAWN_QUESTION_COUNT` (10) random questions from the
  chapter pool (the whole pool if smaller). Correct answers never leave the
  server.
- Submit validates the answer set (exact expected count, no duplicates, all
  ids from the chapter pool — the drawn set itself is not persisted), grades
  against the chapter's `passThreshold` (`requiredCorrect` rounds up, e.g.
  80% of 7 → 6), upserts chapter progress, and on a pass recomputes the
  whole-academy completion snapshot.

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

Quiz questions also carry an append-only `position` (no reorder surface).

## Learner surface

Authenticated users in an org with the academy add-on active
(`@RequireAddon(AYUNIS_CORE_ACADEMY)`), two controllers under `academy`:

- `AcademyChaptersController` (`academy/chapters`) — list chapters with nested
  ordered courseModules.
- `AcademyQuizController` (`academy`) — draw a quiz
  (`GET chapters/:chapterId/quiz`), submit answers
  (`POST chapters/:chapterId/quiz/submit`), and read progress
  (`GET progress`: per-chapter pass state + `academyCompletedAt`).

## Management

Super-admin only (`@SystemRoles(SUPER_ADMIN)`), three controllers under
`super-admin/academy`:

- `SuperAdminAcademyChaptersController` (`super-admin/academy/chapters`) —
  list (chapters with nested ordered courseModules), create, update (incl.
  `quizEnabled`/`passThreshold`), delete, reorder (`PUT chapters/order`,
  declared before the `:id` routes).
- `SuperAdminAcademyCourseModulesController` (`super-admin/academy`) — create
  (`POST chapters/:chapterId/course-modules`), reorder
  (`PUT chapters/:chapterId/course-modules/order`), update/delete (`course-modules/:id`).
- `SuperAdminAcademyQuizQuestionsController` (`super-admin/academy`) — create
  (`POST chapters/:chapterId/quiz-questions`), update/delete
  (`quiz-questions/:id`).

## Layout

Standard hexagonal: `domain/` (chapter, courseModule, quiz question, progress
and completion entities), `application/` (repository ports, use-cases, quiz
constants, errors, reorder validation), `infrastructure/` (Postgres records +
mapper + repositories), `presenters/http/` (learner + super-admin controllers,
DTOs, response mapper).
