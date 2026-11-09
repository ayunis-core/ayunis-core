# Outlook add-in

Static files of the Outlook add-in, served from `<FRONTEND_BASEURL>/outlook/`.
The manifest that points Outlook here is rendered by the backend's
`office-addins` module (`GET /api/office-addins/outlook/manifest.xml`).

| File | Purpose |
| --- | --- |
| `taskpane.html`, `taskpane.js`, `taskpane.css` | Task pane both add-in buttons open (`?surface=messageRead` or `messageCompose`). Loads Office.js from Microsoft's CDN. A "coming soon" placeholder until AYC-1591 replaces it. |
| `assets/icon-<size>.png` | Add-in and button icons in the sizes Outlook requires (16, 32, 80 ribbon; 64, 128 add-in icon). Rendered from `favicon/favicon.svg`. |

Keep these paths: they are part of the manifest admins have deployed, and
changing them means every tenant has to deploy an updated manifest.
