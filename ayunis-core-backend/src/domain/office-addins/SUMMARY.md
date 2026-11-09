# Office Add-ins Module

## Purpose

Serves the manifests that Microsoft 365 and Exchange admins deploy to install
Ayunis as an Office add-in. Only Outlook exists so far.

## Outlook manifest

`GET /api/office-addins/outlook/manifest.xml` (public, not in the OpenAPI spec)
returns the add-in-only XML manifest rendered for this deployment's
`FRONTEND_BASEURL` (`renderOutlookManifest`). How admins install it is in
`DEPLOYMENT.md` ("Outlook Add-in").

- **Id** is derived from the base URL (`outlookAddinId`): stable across
  releases, different per deployment, so staging and production can be
  installed side by side in one tenant. Changing the derivation or the base URL
  makes it a new add-in that every tenant must deploy again.
- **Version** (`OUTLOOK_MANIFEST_VERSION`) must be bumped whenever the manifest
  changes; Microsoft 365 only applies a higher version.
- **Buttons**: one task pane button when reading and one when composing a
  message, both pinnable. Each opens `/outlook/taskpane.html?surface=<surface>`
  (`messageRead`, `messageCompose`), so the pane can serve both differently
  without a manifest change.
- **Requirement sets**: Mailbox 1.5 for the VersionOverrides 1.1 block, which
  pinning needs and Exchange Server (on-premises) still supports; 1.3 for the
  1.0 block read by older clients. `SupportsSharedFolders` only takes effect on
  clients with Mailbox 1.8 (shared folders) and 1.13 (shared mailboxes).
- **Permissions** are `ReadWriteItem`: read and change the message the add-in
  is opened on. Higher permissions, Microsoft Graph scopes and event-based
  activation are not requested; adding any of them later needs every tenant
  admin to consent again.

The `Outlook manifest` workflow renders the manifest with
`pnpm --filter core-backend office-addins:outlook-manifest` and validates it
with Microsoft's `office-addin-manifest` validator, which calls Microsoft's
online validation service.

The task pane and the icons are static files in
`ayunis-core-frontend/public/outlook`. Outlook on the web shows the pane in an
iframe, so these files must stay frameable by the Outlook origins.
