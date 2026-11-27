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
  views. It supplies a `ChatConfig` with the bearer transport, the `narrow`
  layout, session-owned drafts, client tools and events to `@ayunis/chat`.
  `ui/PaneConversation.tsx` renders the package `Conversation` screen for the
  open chat: the package loads the thread and renders its header (title,
  anonymous badge, Rename and Delete, and the New chat button the pane asks
  for through `ChatConfig.newChat`), the composer, citations with their dialog,
  PII reveal, read aloud and the sent, waiting and failed message. The pane
  passes no workspaces, favorites, trail, artifact panel or navigation, so
  those controls and the citation's recording link do not show. After a delete
  the pane opens the history (`events.onThreadDeleted`).
  History queries remain scoped to `SessionClient.outlook`, while the list,
  empty/loading/error states, pagination, thread dialogs, and academy notice use
  the canonical package presentation. The pane supplies offset navigation,
  mutations, retry, back, and sign-out behavior.
  Attachment and source badges, uploads to an existing chat and source
  removal are package-owned. A new conversation's files are uploaded by the
  pane once it created the chat, and its first send uses the package handoff
  after attachments are ready. Stop and explicit pane navigation cancel preparation. Web chat
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
