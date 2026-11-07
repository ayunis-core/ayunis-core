Notifications
A per-user inbox of messages from routine runs, with read state

A notification is a message in one user's inbox. Routine runs post them: a routine sends its findings with the `send_notification` tool, and the system posts an error notification when a routine run fails. From a notification the user can start a chat about it ("Chat about this").

The `Notification` entity belongs to its recipient (`userId`, FK ON DELETE CASCADE, so deleting a user deletes their notifications) and their organization (`orgId`, CASCADE). It carries a `type` (`routine` for a routine's own finding, `routine_error` for a failed run), `headline` (≤ 200 characters), `subheadline` (≤ 300), a markdown `body` (≤ 10,000, may contain links), the origin `routineId` and `routineThreadId` (both FK ON DELETE SET NULL: deleting the routine or the routine thread keeps the notification and drops only the link), `readAt` (null while unread) and `createdAt`. The table is indexed on `(userId, createdAt)` for the inbox, `(orgId, createdAt)` for retention, and on both origin columns.

`CreateNotificationUseCase` (exported) takes the recipient in the command, because notifications are posted by the system (a routine run acting for its owner, or the routine sweep without any user context), not by the recipient. It trims the texts and rejects empty or over-long ones (`NOTIFICATION_INVALID`). With `limitPerRoutineThread` it creates the notification only while the routine thread has fewer than that many (`NOTIFICATION_LIMIT_REACHED`, 409, otherwise): the repository counts and inserts in one transaction behind a PostgreSQL advisory lock on the thread, so concurrent tool calls of one run cannot exceed the limit.

The inbox endpoints (`NotificationsController`, `/notifications`) are behind the `routines` feature flag (disabled → 404) and are not gated by the `manage_routines` permission, so notifications stay readable when it is revoked. Every read and write filters by the current user; another user's notification answers 404 (`NOTIFICATION_NOT_FOUND`), like a missing one.

| Method | Path | Use case |
| ------ | ---- | -------- |
| GET | `/notifications?limit&offset&routineId&type` | `FindMyNotificationsUseCase` — newest first, paginated (default 20, at most 100) with the total; `routineId` narrows them to one routine's notifications (findings and errors) for the routine detail page, and another user's routine yields none; `type` narrows them to one notification type for the inbox filter |
| GET | `/notifications/unread-count` | `CountUnreadNotificationsUseCase` — the total (`count`) and, in one grouped query, the count per type (`byType`, only types with unread notifications) for the new chat page |
| POST | `/notifications/read-all` | `MarkAllNotificationsReadUseCase` (204) |
| GET | `/notifications/:id` | `FindNotificationUseCase` (exported) |
| POST | `/notifications/:id/read` | `MarkNotificationReadUseCase` — one `UPDATE … RETURNING`; a second read keeps the first `readAt` |

`DeleteExpiredNotificationsUseCase` (exported) deletes, or in a dry run counts, an org's notifications created before a cutoff; the retention-policies module calls it from its nightly enforcement with the same cutoff it uses for threads.

Consumers, all through exported use cases: **tools** (`SendNotificationToolHandler` → `CreateNotificationUseCase` with a limit of 3 per routine thread), **routines** (`RoutineFailureNotifier` → `CreateNotificationUseCase` for failed and interrupted runs), **threads** (`CreateThreadUseCase` checks a `sourceNotificationId` with `FindNotificationUseCase`), **runs** (`NotificationContextCapability` reads the notification a chat is about) and **retention-policies**. The module itself imports no other domain module; its record references users, orgs, routines and threads only for the foreign keys.
