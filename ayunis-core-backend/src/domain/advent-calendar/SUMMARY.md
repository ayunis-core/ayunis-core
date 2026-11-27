Advent Calendar
A seasonal calendar of 24 feature tips that super admins write and every signed-in user opens, one door a day in December

Each door is an `AdventCalendarDoor` for one day 1–24 (`advent_calendar_doors`, one row per filled day, `day` is the primary key and a check constraint keeps it within 1–24). A door has a `title` (≤ 200), a markdown `body` (≤ 5,000, may be empty), optional `media` and 0–2 `buttons`. Doors are platform-global and kept without year history: next year super admins overwrite them. Nothing is stored per user or per organization, so deleting either has no effect here; which doors a user has opened lives only in the browser.

**Media** is none, an image or a Vimeo video, kept consistent by a check constraint over the media columns. Images are uploaded by super admins (≤ 10 MB, the image allowlist of `content-type.util`, type sniffed from the bytes), stored with `UploadSystemObjectUseCase` under `advent-calendar/<day>/<uuid><ext>`, outside every org-scoped layout, so the org purge and the orphan sweep leave them alone, and served with `nosniff`. A Vimeo URL (`https://vimeo.com/<id>`, `https://vimeo.com/<id>/<hash>` or `https://player.vimeo.com/video/<id>[?h=<hash>]`, nothing else) is stored as `vimeoVideoId` + optional `vimeoHash` (`parseVimeoUrl`); the frontend embeds `https://player.vimeo.com/video/<id>?dnt=1[&h=<hash>]`.

**Buttons** (jsonb, validated on write by the request DTO): `link` (label ≤ 40, an http(s) URL or an in-app path starting with a single `/`, `isAdventCalendarLinkUrl`), `prompt` (label, prompt ≤ 4,000, put into a new chat unsent) and `quiz` (label, question ≤ 300, 2–4 answers ≤ 150, `correctAnswerIndex`, optional explanation ≤ 1,000). At most one quiz per door. Invalid input is rejected with field-level `VALIDATION_ERROR`s before anything is written, so the stored door stays as it was.

## Unlocking

`advent-calendar-season.ts` is the pure unlock rule, computed in Europe/Berlin: the season runs from 1 December to 6 January; door N is due from 00:00 on N December, and in January (the season of the previous year) every door stays due until the season ends. `doorState(now, day, hasContent)` gives `locked` (not due), `empty` (due, no content) or `openable`.

`AdventCalendarAccessService` decides what the caller sees: the calendar is `visible` when the `ADVENT_CALENDAR_ENABLED` platform-config switch (`GetAdventCalendarEnabledUseCase` from **platform-config**, default off) is on and today is in season; super admins get `preview` and every door with content is openable for them, whether visible or not. Users never receive the content, quiz answers or image of a door that is not openable for them. "Now" comes from `AdventCalendarClock`; `ADVENT_CALENDAR_NOW` (`adventCalendar.now`, e2e tests only) starts that clock at a given instant when the backend boots.

## HTTP

`AdventCalendarController` (`/advent-calendar`, any signed-in user):

| Method | Path                | Use case                                                                                                                                                                    |
| ------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/`                 | `GetAdventCalendarUseCase` — `visible`, `preview`, `now` and all 24 doors with `state` and, for openable doors only, `content`; no doors when neither visible nor previewed |
| GET    | `/doors/:day/image` | `DownloadAdventCalendarDoorImageUseCase` — 404 `ADVENT_CALENDAR_DOOR_IMAGE_NOT_FOUND` unless the door is openable for the caller and has an image                           |

`SuperAdminAdventCalendarController` (`/super-admin/advent-calendar`, `SUPER_ADMIN` only):

| Method | Path                | Use case                                                                                                                                          |
| ------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/`                 | `GetAdventCalendarManagementUseCase` — the switch and all 24 doors with their full content (`null` when empty)                                    |
| PUT    | `/enabled`          | `SetAdventCalendarEnabledUseCase` (**platform-config**)                                                                                           |
| PUT    | `/doors/:day`       | `SaveAdventCalendarDoorUseCase` — creates or replaces title, body, buttons and video; a Vimeo URL replaces the image, without one the image stays |
| PUT    | `/doors/:day/image` | `UploadAdventCalendarDoorImageUseCase` — multipart `file`; replaces the image or video; 404 `ADVENT_CALENDAR_DOOR_NOT_FOUND` for an empty door    |
| DELETE | `/doors/:day/image` | `RemoveAdventCalendarDoorImageUseCase` — keeps the text                                                                                           |
| GET    | `/doors/:day/image` | `DownloadAdventCalendarDoorImageUseCase`                                                                                                          |
| DELETE | `/doors/:day`       | `ClearAdventCalendarDoorUseCase` — deletes the door and its image; a no-op for an empty door                                                      |

Writes that change a door's image read the door under a row lock (`findByDayForUpdate`) in a transaction, so concurrent edits cannot point a door at a deleted object. Uploads happen before that transaction and the replaced image is deleted after it commits; a failed delete is logged and leaves an unused object behind rather than a door without its image.
