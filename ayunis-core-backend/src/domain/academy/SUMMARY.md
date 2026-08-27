# Academy

Platform-global learning content for the **Ayunis Core Academy** add-on
(`AddonType.AYUNIS_CORE_ACADEMY`): ordered chapters containing Loom video course
modules, authored centrally by super admins. Learners confirm each chapter after
watching its videos and build toward whole-academy completion.

## Model and completion

- `AcademyChapter` — `{ id, title, description, position, courseModules[] }`.
- `AcademyCourseModule` — `{ id, chapterId, title, description?, loomUrl, position }`,
  cascade-deleted with its chapter. Loom URLs are validated share/embed links.
- `AcademyChapterConfirmation` — `{ id, userId, chapterId, confirmedAt }`, one
  row per user and chapter. The repository uses a single atomic upsert;
  reconfirming refreshes `confirmedAt` for annual renewal.
- `AcademyCompletion` — the single per-user whole-academy snapshot. Confirming
  the final configured chapter stamps `completedAt`. Existing snapshots are
  never cleared by content changes, so adding a chapter does not revoke a
  previous completion.

`ConfirmChapterUseCase` rejects unknown chapters, atomically writes the
confirmation, then completes the academy only when every configured chapter has
a confirmation inside the 12-month validity window. An empty academy is not
complete. Renewal therefore requires reconfirming every chapter rather than
refreshing only one.

`GetAcademyProgressUseCase` returns per-chapter `confirmed`,
`confirmationValid`, and `confirmedAt` fields plus the whole-academy completion
and expiry dates.

## Completion validity and access

`application/util/certificate-validity.ts` owns the 12-month period and derives
`certificateExpiresAt` with month-end clamping. `AcademyCompletionView`
publishes `{ completedAt, expiresAt }` to consumers. The academy-access module
continues to consume only this whole-academy view; it never reads chapter
confirmations.

`GetAcademyCompletionsUseCase` provides the bulk many-user view used by the
organization certificate overview without N+1 queries.

## Participation confirmation PDF

`GetAcademyCertificateUseCase` retains the existing download API while rendering
a German **Teilnahmebestätigung** for the “KI-Schulung nach EU AI Act” on demand
from the whole-academy completion. The document states participation and contains
no quiz or examination language. Rendering uses the owned HTML template and the
lazy Puppeteer renderer under `infrastructure/certificate/`.

## Ordering

Chapters globally and course modules per chapter carry a 0-based `position`.
Creates append at the current maximum. Reorder operations require exact set
equality and persist `0..n-1` in a transaction. Concurrent super-admin reorders
are last-write-wins.

## HTTP

Learner routes are authenticated and add-on gated:

- `GET /academy/chapters` — ordered chapters with ordered course modules.
- `POST /academy/chapters/:chapterId/confirm` — idempotently confirm or
  reconfirm a chapter.
- `GET /academy/progress` — chapter confirmation and academy completion state.
- `GET /academy/certificate` — download the participation confirmation PDF;
  unavailable until whole-academy completion.

Super-admin routes under `/super-admin/academy` manage and reorder chapters and
course modules. There is no quiz enablement, pass threshold, or question
management configuration.

## Layout

Standard hexagonal layout: pure entities in `domain/`, ports and use cases in
`application/`, TypeORM records/mappers/repositories and PDF rendering in
`infrastructure/`, and thin HTTP controllers/DTO mappers in `presenters/http/`.
