# Shared Office add-in foundation

`@ayunis/office-addin` contains platform plumbing shared by the Outlook, Excel,
Word, and PowerPoint task panes:

- Office.js readiness, context access, display language, and dialog capability
- Office dialog sign-in and same-origin session handoff
- Cookie-free bearer sessions with serialized refresh and surface-specific
  refresh-token storage
- The host-neutral authentication state machine and signed-out shell

Consumers provide their surface client, login path, refresh-token key,
localized copy, brand asset, and signed-in application. Workbook, mail,
document, slide, chat, and model behavior must stay in the consuming app or its
domain package. This package must not grow a generic Office command layer.
