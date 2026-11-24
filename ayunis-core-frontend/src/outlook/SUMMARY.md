# Outlook add-in

The pages Outlook opens for the Ayunis Core add-in (`ayunis-core-frontend/outlook/*.html`).
The HTML pages load Office.js from Microsoft's CDN first. The manifest
(`GET /api/office-addins/outlook/manifest.xml`, backend `office-addins`
module) points every button at `/outlook/taskpane.html?surface=<surface>`;
keep that path, tenant admins have deployed it. Clients that read the
manifest's VersionOverrides 1.1 block also pass
`manifestVersion=<version>`; a feature that depends on something only a newer
manifest declares checks a minimum version there.

The `apps/outlook` Vite build ships the dialog, launch events, icons and task
pane HTML under `/outlook`. `pnpm run build:surfaces` builds the web app first
and bundles both builds for the backend. The task pane still runs the embedded
web app through `src/main.tsx` and its `data-entry="outlook-pane"` branch. The
Outlook build copies the web page's asset tags into the pane HTML, so it
shares the app files without loading `/config.js` or building another copy.
During Vite development the existing templates under
`ayunis-core-frontend/outlook` keep the same URLs.

The launch-event runtime handles every event the manifest registers
(`OnMessageCompose`, `OnMessageRecipientsChanged`,
`OnMessageAttachmentsChanged`, `OnMessageFromChanged`,
`OnInfoBarDismissClicked`). `events.html` loads only Office.js and
`events.ts`; classic Outlook on Windows runs `public/outlook/events-classic.js`
instead, a single file without imports. Both register one handler per event,
named after the event (`onMessageCompose`, …), that calls `event.completed()`
at once and makes no network call; no feature uses them yet. Keep the names in
both files in step with the manifest. Outlook's own Reply inserts nothing. In
the reading pane, the latest draft offers "Allen antworten" / "Reply all" and
"Antworten" / "Reply", which open Outlook's reply form with the draft
(`displayReplyAllForm` / `displayReplyForm`, the async variants from Mailbox
1.9); in an open reply, the compose pane offers "Insert into open reply".

| Path                                                                        | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `taskpane.tsx`, `ui/TaskPane.tsx`, `ui/EmbeddedApp.tsx`                     | The pane: signed out (sign-in button, "Use a different account" link, errors for a failed sign-in, an expired session or an unreachable backend), signed in (the chat app in embedded mode, one app and query cache per sign-in). The pane owns sign-in: when the session ends inside the app (a rejected refresh, or "Abmelden" on the embedded history page), `PaneSession.onEnd` brings the sign-in back. The app keeps its routes in memory, so the frame never loads an app route that Outlook may not frame (AYC-1899), and a reload reloads the pane. Office.js is checked when Sign in is pressed, not once at load: on a cold desktop start it is often not ready yet. Both the sign-in and the app follow Outlook's display language. |
| `lib/pane-item-chats.ts`, `lib/follow-outlook-item.ts`, `lib/item-chats.ts` | One chat per email on the device. The pane matches a read item’s Internet Message-ID to the compose item’s `inReplyTo` to open the same chat in the reply. Existing EWS-keyed chats are still found when the original email is opened. Selecting another email in a pinned pane reopens its chat or starts a new chat. The map uses `localStorage` for the 500 most recently used emails per Ayunis user. It records the selected email when a chat is started or opened, so switching emails while a chat loads does not reassign it. Untitled new chats and unrelated compose items keep the current chat.                                                                                                                                    |
| `features/outlook-tools` (shared)                                           | Office.js for the five `outlook__` tools, run by the embedded chat app (see `src/features/SUMMARY.md`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `api/pane-session.ts`                                                       | The pane's API access: Bearer access token in memory, refresh token in `localStorage`, one body refresh and retry on 401 (single flight, since refresh tokens rotate), sign-out through `POST /auth/logout` with the token in the body. `onEnd` tells the pane when the session ended (`expired` or `signedOut`). Never sends cookies. The pane entry supplies its authenticated transport to `@ayunis/api-client` before mounting chat.                                                                                                                                                                                                                                                                                                        |
| `lib/sign-in-dialog.ts`                                                     | Opens `/outlook/login?client=outlook` with `displayDialogAsync` (`displayInIframe` off, identity providers refuse framing) and turns the dialog's message or close event into results. A close (12006) is not final: Office also reports it when an identity provider cuts the dialog off during SSO, so the pane stays ready for a late message and shows a hint to sign in again.                                                                                                                                                                                                                                                                                                                                                             |
| `dialog.ts` (`/outlook/dialog.html`)                                        | Last page of the dialog: calls `POST /auth/session/handoff` with the dialog's cookies (which stay in place) and sends `{ type: 'session', accessToken, refreshToken, expiresIn }` or `{ type: 'error', code }` through `messageParent`. Does nothing outside Office.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `model/dialog-message.ts`                                                   | The message contract between dialog and pane.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `lib/i18n.ts`                                                               | German and English from `shared/locales/*/outlook.json`, chosen by Outlook's display language.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

The login itself is the SPA's: `/outlook/login` (route in `app/routes/(onboarding)`)
shows the regular login page with `/outlook/handoff` as its redirect, so
password, two-factor and SSO (through the `redirect` the SSO flow keeps in
session storage) all end there. `/outlook/handoff` leaves the SPA with a full
page load to `/outlook/dialog.html`, because Office.js must not run inside the
SPA. A user already signed in in the dialog's browser goes straight to the
handoff, unless the pane opened the dialog with `prompt=login` ("Use a
different account"): then the form shows and the new login replaces that
session. The handoff gives the pane its own session and leaves the browser
session as it is (on Outlook on the web the dialog shares cookies with the web
app), so a sign-in that SSO cut off from the pane completes on the next dialog.

The backend restricts sessions handed to a client to routes marked
`@AllowedClients('outlook')`; see `docs/architecture/authentication.md`.
