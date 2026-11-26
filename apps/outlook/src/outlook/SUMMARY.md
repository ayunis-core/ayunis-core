# Outlook add-in

The standalone pane is a Vite app under `apps/outlook`. Its task pane, sign-in
handoff, launch events, and classic event script are served under `/outlook`.
The manifest and `/outlook/taskpane.html` URLs stay stable for installed copies.

- `taskpane.tsx` owns the Outlook language and session. The sign-in window uses
  the normal web sign-in routes and hands bearer tokens back through Office.js.
  The pane sends requests without cookies and refreshes bearer tokens once on a
  rejected request. Sign-out and expiry dispose the principal's local run state
  and query cache.
- `ui/OutlookChatApp.tsx` owns the pane's new-chat, conversation, and history
  views. It supplies the bearer transport, scope-derived capabilities, thread
  operations, and session-owned drafts and run state to `@ayunis/chat`.
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
  only for that email. The shared lifecycle governs tool execution and results.

The backend surface registry governs framing and API scopes.
`pnpm run build:surfaces` bundles web and Outlook separately for one backend
image to serve. The browser suite lives in `ayunis-core-e2e/tests/outlook`.
