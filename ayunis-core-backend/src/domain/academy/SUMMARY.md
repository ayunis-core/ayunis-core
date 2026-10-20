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
- `AcademyModuleViewTime` — `{ userId, courseModuleId, visibleSeconds }`, one
  row per user and course module (`academy_module_view_times`), cascade-deleted
  with either. It is page time, not watch time: Loom embeds expose no playback
  events, so the frontend sends a heartbeat every 15 s while the page is
  visible and the player is in the viewport.
- `AcademyCompletion` — the single per-user whole-academy snapshot. Confirming
  the final configured chapter stamps `completedAt`. Existing snapshots are
  never cleared by content changes, so adding a chapter does not revoke a
  previous completion.

`RecordModuleHeartbeatUseCase` credits the time since the learner's latest
heartbeat on any course module, capped at one 15 s interval; a `sessionStart`
heartbeat only stamps the clock. There is one clock per learner, so tabs or
windows showing several videos at once split the time instead of each earning
it. A per-learner advisory lock (`lock-learner.ts`) serialises concurrent
heartbeats, and the server never trusts a client-reported duration. The
frontend sends heartbeats through one ordered queue per tab, so a module's
closing beat always arrives before the next module's session start.

`ConfirmChapterUseCase` rejects unknown chapters, rejects a chapter whose
modules have not each reached the platform-wide minimum
(`GetAcademyMinimumModuleSecondsUseCase` from platform-config, default 60 s;
chapters without modules stay confirmable) with
`ChapterModulesBelowMinimumTimeError` (409, listing the short module ids),
atomically writes the
confirmation, then completes the academy only when every configured chapter has
a confirmation inside the 12-month validity window. An empty academy is not
complete. Renewal therefore requires reconfirming every chapter rather than
refreshing only one. Stamping a completion deletes the user's module view
times, so a renewal needs the minimum time on every video page again.
The confirmation, completion and reset run in one transaction
(`@Transactional`) that first takes the same per-learner lock, so a completion
is never committed without its reset and two final-chapter confirmations sent
at once cannot each miss the other and leave the certificate unrecorded.
A confirmation of the same chapter repeated within five minutes is replayed
(the existing confirmation is returned without re-checking page time), so a
retried final confirmation still succeeds after that reset; progress reports
it per chapter as `replayable` so the UI does not block that retry.

`GetAcademyProgressUseCase` returns per-chapter `confirmed`,
`confirmationValid`, and `confirmedAt` fields, the whole-academy completion
and expiry dates, per-module `visibleSeconds`, and `minimumModuleSeconds`.

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
- `GET /academy/progress` — chapter confirmation, module page time, and
  academy completion state.
- `POST /academy/course-modules/:courseModuleId/heartbeat` — record page time
  for a course module.
- `GET /academy/certificate` — download the participation confirmation PDF;
  unavailable until whole-academy completion.

Super-admin routes under `/super-admin/academy` manage and reorder chapters and
course modules. There is no quiz enablement, pass threshold, or question
management configuration.

## Layout

Standard hexagonal layout: pure entities in `domain/`, ports and use cases in
`application/`, TypeORM records/mappers/repositories and PDF rendering in
`infrastructure/`, and thin HTTP controllers/DTO mappers in `presenters/http/`.
