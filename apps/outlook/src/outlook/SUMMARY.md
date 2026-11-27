# Outlook add-in

The standalone pane is a Vite app under `apps/outlook`. Its task pane, sign-in
handoff, launch events, and classic event script are served under `/outlook`.
The manifest and `/outlook/taskpane.html` URLs stay stable for installed copies.

- `taskpane.tsx` configures the host-neutral `@ayunis/office-addin` foundation
  with Outlook's client, login path, refresh-token key, localized copy, and
  signed-in chat. The shared package owns Office.js readiness, dialog sign-in,
  session handoff, bearer-session restore/refresh/sign-out, display-language
  mapping, and the signed-out shell. Sign-out and expiry dispose the
  principal's local run state and query cache.
- `ui/OutlookChatApp.tsx` owns the pane's new-chat, conversation, and history
  views. It supplies the bearer transport, scope-derived capabilities, thread
  operations, and session-owned drafts and run state to `@ayunis/chat`.
  History queries remain scoped to `SessionClient.outlook`, while the list,
  empty/loading/error states, pagination, thread dialogs, and academy notice use
  the canonical package presentation. The pane supplies offset navigation,
  mutations, retry, back, and sign-out behavior.
  Attachment and source badges use the package's canonical Web-derived
  presentation while the pane retains upload and removal transport ownership.
  A new conversation's first send uses the package handoff after attachments
  are ready. Stop and explicit pane navigation cancel preparation. Web chat
  uses its own router and build.
- `lib/pane-item-chats.ts` tracks one chat per email and principal. It matches
  the original email when a reply opens, supports older EWS-keyed associations,
  and captures the mail when creation or navigation begins.
- `lib/use-standalone-outlook-tools.ts` registers the Office.js executors and
  draft cards. A draft belongs to its original email and can open or fill a reply
  only for that email. The shared lifecycle governs tool execution and results;
  `lib/use-outlook-tool-dispatch.ts` ties each run and call to the email it was
  made for.

The backend surface registry governs framing and API scopes.
`pnpm run build:surfaces` bundles web and Outlook separately for one backend
image to serve. The browser suite lives in `ayunis-core-e2e/tests/outlook`.
