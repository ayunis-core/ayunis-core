# Office Add-ins Module

## Purpose

Serves the manifests that Microsoft 365 and Exchange admins deploy to install
Ayunis Core as an Office add-in. Only Outlook exists so far.

## Outlook manifest

`GET /api/office-addins/outlook/manifest.xml` (public, behind `FEATURE_OUTLOOK_ADDIN_ENABLED`, not in the OpenAPI spec)
returns the add-in-only XML manifest rendered for this deployment's
`FRONTEND_BASEURL` (`renderOutlookManifest`). The backend surface registry
supplies the manifest route, feature flag, static prefix and launch document
paths. How admins install it is in
`DEPLOYMENT.md` ("Outlook Add-in").

- **Id** is derived from the base URL (`outlookAddinId`): stable across
  releases, different per deployment, so staging and production can be
  installed side by side in one tenant. Changing the derivation or the base URL
  makes it a new add-in that every tenant must deploy again.
- **Version** (`OUTLOOK_MANIFEST_VERSION`) must be bumped whenever the manifest
  changes; Microsoft 365 only applies a higher version.
- **Names**: the add-in is "Ayunis Core für Outlook" / "Ayunis Core for
  Outlook", so admins can tell it apart from later Word or Excel add-ins in
  the admin center. Its ribbon group and button are "Ayunis Core"; the tooltip
  and description say "Ayunis Core" too, in German and English.
  `ProviderName` is the company, Ayunis.
- **Buttons**: one task pane button when reading and one when composing a
  message, both pinnable. Each opens `/outlook/taskpane.html?surface=<surface>`
  (`messageRead`, `messageCompose`), so the pane can serve both differently
  without a manifest change.
- **`manifestVersion`**: the pane URLs in the VersionOverrides 1.1 block also
  carry `manifestVersion=<OUTLOOK_MANIFEST_VERSION>`. A feature that needs
  something only a newer manifest declares (such as a launch event) checks a
  minimum version there instead of adding its own URL flag. The legacy
  `FormSettings` URL and the 1.0 block carry none: their clients cannot run
  launch events.
- **Requirement sets**: Mailbox 1.5 for the VersionOverrides 1.1 block, which
  pinning needs and Exchange Server (on-premises) still supports; 1.3 for the
  1.0 block read by older clients. `SupportsSharedFolders` only takes effect on
  clients with Mailbox 1.8 (shared folders) and 1.13 (shared mailboxes).
- **Permissions** are `ReadWriteItem`: read and change the message the add-in
  is opened on. No Microsoft Graph scopes are requested.
- **Launch events** (1.1 block only): `OnMessageCompose`,
  `OnMessageRecipientsChanged`, `OnMessageAttachmentsChanged`,
  `OnMessageFromChanged` and `OnInfoBarDismissClicked`. They are registered
  ahead of any feature, so later features ship through the code at our URLs
  instead of a manifest every tenant admin must redeploy. Each `FunctionName`
  is the event's name in camel case (`onMessageCompose`, …), never a
  feature's. All of them run in one runtime: `/outlook/events.html` in
  browser-based Outlook, `/outlook/events-classic.js` in classic Outlook on
  Windows. Both register every name and call `event.completed()` at once; no
  handler does anything yet.
  - An added event appears in the Microsoft 365 admin center's update wizard
    and only takes effect once an admin consents to the update.
  - Send events (`OnMessageSend`, `OnAppointmentSend`) can hold back the
    user's mail, so adding one needs a deliberate decision.
  - Automatic activation requires admin deployment of the manifest.

The `Outlook manifest` workflow renders the manifest with
`pnpm --filter core-backend office-addins:outlook-manifest` and validates it
with Microsoft's `office-addin-manifest` validator, which calls Microsoft's
online validation service.

The task pane runs the frontend's own build in embedded mode: the build writes
`/outlook/taskpane.html` from the web page's asset tags (see
`ayunis-core-frontend/src/outlook/SUMMARY.md`); the icons are static files in
`ayunis-core-frontend/public/outlook/assets`. Outlook on the web shows the pane
and runs `events.html` in an iframe, so both pages must stay frameable by the
Outlook origins.
