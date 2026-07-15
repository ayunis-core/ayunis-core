# Academy

Platform-global learning content for the **Ayunis Core Academy** add-on
(`AddonType.AYUNIS_CORE_ACADEMY`): chapters containing video courseModules and an
optional per-chapter quiz, authored centrally by super admins. Learners in an
org with the add-on active read the content, take chapter quizzes, and build up
progress toward whole-academy completion.

## Model

- `AcademyChapter` — `{ id, title, description, position, quizEnabled,
  passThreshold, courseModules[], quizQuestions[] }`. `quizEnabled` shows the
  quiz at chapter end; `passThreshold` is the percent of correct answers needed
  to pass (default 80).
- `AcademyCourseModule` — `{ id, chapterId, title, description?, loomUrl, position }`,
  cascade-deleted with its chapter. `loomUrl` is a validated Loom share/embed
  link (`https://loom.com/(share|embed)/...`).
- `AcademyQuizQuestion` — `{ id, chapterId, text, options[], position }`,
  cascade-deleted with its chapter. `options` is jsonb `{ text, isCorrect }[]`
  with 2–6 options, exactly one correct (`quiz-question-validation.ts`).

## Quiz-taking & progress

Learner-facing, add-on gated (`@RequireAddon`), correct answers never sent to
the client:

- `GetChapterQuizUseCase` draws up to `DRAWN_QUESTION_COUNT` (10) random
  questions — the whole pool when smaller (`quiz.constants.ts`).
- `SubmitChapterQuizUseCase` grades against `requiredCorrect(total, threshold)`
  (ceil), enforces the drawn answer count (the drawn set itself is not
  persisted), upserts `AcademyChapterProgress` (one row per user+chapter:
  `passedAt` refreshed on each pass, `lastScore`), and — when every
  `quizEnabled` chapter has a passing row — stamps the single per-user
  `AcademyCompletion.completedAt` snapshot. That snapshot is the anchor
  for the future access gate: it is only ever written on full completion, never
  cleared by content changes, so adding a chapter never revokes a completion.
- `GetAcademyProgressUseCase` returns per-chapter pass state + the completion
  date. Unlimited retries; each retry re-draws.

## Certificate

`GetAcademyCertificateUseCase` renders the German "KI-Führerschein" completion
certificate as a PDF **on demand** from the `AcademyCompletion` row (404 via
`AcademyCompletionNotFoundError` when the academy is not completed). Nothing is
stored: the PDF is derived from the user's current name
(`FindUserByIdUseCase`) and `completedAt` — a rename changes a re-downloaded
certificate by design. Rendering goes through `CertificateRendererPort`,
implemented by `PuppeteerCertificateRendererService`
(`infrastructure/certificate/`): an owned HTML template
(`certificate-template.ts`, layout metrics measured from the official template
PDF, user name HTML-escaped, assets + Source Sans 3 font embedded as data URIs
in `certificate-assets.ts`) printed to A4 by a lazy headless-Chromium
singleton (same pattern as the artifacts export service).

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
(`@RequireAddon(AYUNIS_CORE_ACADEMY)`), three controllers under `academy`:

- `AcademyChaptersController` (`academy/chapters`) — list chapters with nested
  ordered courseModules (no quiz questions).
- `AcademyQuizController` (`academy`) — draw a quiz
  (`GET chapters/:chapterId/quiz`), submit answers
  (`POST chapters/:chapterId/quiz/submit`), and read progress
  (`GET progress`: per-chapter pass state + `academyCompletedAt`).
- `AcademyCertificateController` (`academy/certificate`) — download the
  completion certificate PDF (`GET`, streamed with `Content-Disposition:
  attachment`; 404 until the academy is completed).

## Management

Super-admin only (`@SystemRoles(SUPER_ADMIN)`) under `super-admin/academy`:

- `SuperAdminAcademyChaptersController` (`super-admin/academy/chapters`) —
  list (chapters with nested ordered courseModules **and quiz questions incl.
  correct answers**), create, update (title/description/`quizEnabled`/
  `passThreshold`), delete, reorder (`PUT chapters/order`, before `:id`).
- `SuperAdminAcademyCourseModulesController` (`super-admin/academy`) — create
  (`POST chapters/:chapterId/course-modules`), reorder
  (`PUT chapters/:chapterId/course-modules/order`), update/delete (`course-modules/:id`).
- `SuperAdminAcademyQuizQuestionsController` (`super-admin/academy`) — create
  (`POST chapters/:chapterId/quiz-questions`), update/delete (`quiz-questions/:id`).

## Layout

Standard hexagonal: `domain/` (chapter, courseModule, quizQuestion, chapter
progress + completion entities), `application/` (repository ports, use-cases,
errors, reorder + quiz-question validation, `quiz.constants.ts`),
`infrastructure/` (Postgres records + mapper + repositories), `presenters/http/`
(super-admin + learner controllers, DTOs, response mapper). The learner DTOs
deliberately omit `isCorrect`; grading is server-side.
