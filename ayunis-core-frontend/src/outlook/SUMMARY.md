# Outlook add-in

The pages Outlook opens for the Ayunis add-in. They are separate Vite entries
next to the SPA (`ayunis-core-frontend/outlook/*.html`), load Office.js from
Microsoft's CDN first and never load the SPA shell. The manifest
(`GET /api/office-addins/outlook/manifest.xml`, backend `office-addins`
module) points every button at `/outlook/taskpane.html?surface=<surface>`;
keep that path, tenant admins have deployed it.

| Path                                 | Purpose                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `taskpane.tsx`, `ui/TaskPane.tsx`    | The pane: signed out (sign-in button), signed in (name, email, sign-out), and errors for a failed sign-in, an expired session or an unreachable backend. Office.js is checked when Sign in is pressed, not once at load: on a cold desktop start it is often not ready yet.                                                                                                         |
| `api/pane-session.ts`                | The pane's API access: Bearer access token in memory, refresh token in `localStorage`, one body refresh and retry on 401, sign-out through `POST /auth/logout` with the token in the body. Never sends cookies.                                                                                                                                                                     |
| `lib/sign-in-dialog.ts`              | Opens `/outlook/login?client=outlook` with `displayDialogAsync` (`displayInIframe` off, identity providers refuse framing) and turns the dialog's message or close event into results. A close (12006) is not final: Office also reports it when an identity provider cuts the dialog off during SSO, so the pane stays ready for a late message and shows a hint to sign in again. |
| `dialog.ts` (`/outlook/dialog.html`) | Last page of the dialog: calls `POST /auth/session/handoff` with the dialog's cookies (which stay in place) and sends `{ type: 'session', accessToken, refreshToken, expiresIn }` or `{ type: 'error', code }` through `messageParent`. Does nothing outside Office.                                                                                                                |
| `model/dialog-message.ts`            | The message contract between dialog and pane.                                                                                                                                                                                                                                                                                                                                       |
| `lib/i18n.ts`                        | German and English from `shared/locales/*/outlook.json`, chosen by Outlook's display language.                                                                                                                                                                                                                                                                                      |

The login itself is the SPA's: `/outlook/login` (route in `app/routes/(onboarding)`)
shows the regular login page with `/outlook/handoff` as its redirect, so
password, two-factor and SSO (through the `redirect` the SSO flow keeps in
session storage) all end there. `/outlook/handoff` leaves the SPA with a full
page load to `/outlook/dialog.html`, because Office.js must not run inside the
SPA. A user already signed in in the dialog's browser goes straight to the
handoff. The handoff gives the pane its own session and leaves the browser
session as it is (on Outlook on the web the dialog shares cookies with the web
app), so a sign-in that SSO cut off from the pane completes on the next dialog.

The backend restricts sessions handed to a client to routes marked
`@AllowedClients('outlook')`; see `docs/architecture/authentication.md`.
