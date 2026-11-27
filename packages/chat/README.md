# Ayunis chat

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the canonical Web-derived
experience, host-boundary ownership, dependency rules, and parity baseline.

`@ayunis/chat/tool-cards` exposes the chat tool-card registration contract.
The application supplies card components keyed by tool name. A registration
can also supply an action label, mark a tool as creating an artifact, or group
successive operations on the same artifact by family.

Cards receive the tool call, its result, streaming state and an optional
`onOpenArtifact` callback. The host decides how to open an artifact.

`@ayunis/chat/runs` provides run execution, event streaming, local cancellation,
and first-message handoff. A host supplies its send endpoint and can supply
follow and cancel endpoints when available. The authenticated adapter connects
to the existing thread run endpoints through the host's API transport.
Authentication recovery, cache refreshes, analytics, and notifications stay
with the host.

The package also provides shared chat views:

- `@ayunis/chat/messages` renders the message list, message bubbles, image
  previews, and assistant message frame. The app supplies message actions,
  authenticated image URLs, and rich run content.
- `@ayunis/chat/markdown` renders Markdown, citations, and PII reveal controls.
  The conversation provides the citation and mask handlers itself.
- `@ayunis/chat/composer` renders the composer field and attachment previews.
  The configured composer inside `Conversation`, `NewChat` and
  `NewChatComposer` from `@ayunis/chat/surface` adds the canonical Web-derived toolbar, model picker,
  anonymous button, upload menu with the audio picker, prompt recall,
  paste/drop handling, voice input, send/stop lifecycle, attachment chips, and
  the academy, unavailable-model, provider-fault and long-chat notices. It has
  no slots. Import `@ayunis/chat/composer.css` for the styles.
- `@ayunis/chat/attachments` renders the canonical source, knowledge-base, and
  integration badges, including upload, processing, reindexing, and failure
  states. Hosts supply source data and removal callbacks.
- `@ayunis/chat/history` renders history lists, entries, loading/error/empty
  states, pagination, and thread rename/delete dialogs. Hosts retain queries,
  routing, mutation side effects, and row-specific actions; pagination exposes
  a typed control renderer when a host must preserve router-link semantics.
- `@ayunis/chat/model-presentation` owns the canonical academy gate,
  unavailable-model, provider-fault, and long-chat notices. Hosts supply status
  and actions such as academy navigation or starting a new chat.

- `@ayunis/chat/workspaces` renders workspace icons and the workspace picker
  menu body, from the workspace's id, name, icon and colour.
- `@ayunis/chat/notifications` renders a notification type's icon and its
  unread count, which the new chat's unread tabs and the hosts' inbox share.

`@ayunis/chat/surface` provides the `NewChat` and `Conversation` screens, the
embedded `NewChatComposer`, scrolling shell, run lifecycle, and the
`ChatConfig` contract. Hosts
import `@ayunis/chat/surface.css`; they do not supply replacement conversation,
header or composer renderers.

## ChatConfig

Each surface describes itself with one `ChatConfig`:

- `sessionKey`: changes when the authenticated principal changes.
- `transport`: the run endpoints (`createAuthenticatedRunEndpoints`).
- `layout`: `'page'` or `'narrow'`. It never changes which features show; the narrow layout
  keeps the desktop model-picker hierarchy at pane width.
- `drafts`: principal-scoped `ChatDraftStorage`; in memory by default.
- `knowledgeBases`, `integrations`, `skills`: surface-specific data. A feature
  shows when its data is passed and is absent, with no requests, otherwise.
  Hosts load the menu items themselves and keep the attached or selected items.
- `workspaces` (the new chat's workspace picker, with the host keeping
  `selected`; Move to workspace in the header menu; `create` opens the host's
  own creation), `skills.pinned` (the new chat's pinned skills),
  `productUpdates` (the unread tabs under the new chat's composer: a tab per
  notification type with unread ones, plus product updates when
  `releaseNotes` is passed), `onboarding` (the new chat's onboarding hint for
  the user's stage), `favorites` (the pin), `artifactPanel` (its header
  button), `contextHint` (the summary before the first message and the action
  that opens it), `trail` (the breadcrumbs before the title, as navigation
  targets) and `newChat` (a New chat button in the header): conversation
  features shown only when their data is passed.
- `toolCards` and `clientTools`: the rich-card and client-tool registries.
- `events`: `onNewChat` (the notices' New chat action), `onThreadStarted` (a
  new chat was started; the host opens it), `onNavigate` and `hrefFor` (links
  that leave the chat: the academy, the trail, a chat's origin, a cited
  recording, and the unread notifications and product updates; without
  `onNavigate` the academy, origin and recording links are not shown),
  `onOpenArtifact`, `onThreadState` (the chat's live messages and masks),
  `onThreadDeleted`, `onRunError`, `onRunSettled`, `observeRun`,
  `onMessageCopied`, `onCodeCopied`, `onUnauthorized` and `onError`.
- `tourTargets`: `data-tour` names the package puts on its composer, upload,
  voice, send, model and anonymous controls, the workspace picker and the
  pinned skills.

The config carries no UI. The composer fetches its shared data itself through
`@ayunis/api-client`, with the transport the host configured through
`configureApiTransport` and the host's `QueryClientProvider`: permitted models
and modes, the default selection and chat-start defaults, the embedding and
academy status, the `voiceEnabled` flag, thread uploads with their progress,
source removal, and transcription. Composer errors are shown as toasts.

## NewChat

Render `NewChat` from `@ayunis/chat/surface` with the surface's `ChatConfig`,
its `content` and the session's run `lifecycle`. `content` is strict data: a
`greeting` (`title`, optional `subtitle`) and `starterPrompts` (`label`,
`prompt`), each sending its prompt as the first message. `draftKey` keeps the
unsent message, and a start in progress, under a key (Outlook: per email);
`prefill` opens the screen with a model, a message or files, e.g. from a link.

The package renders the greeting, the starters, the composer with its lift and
backdrop, the academy notice (for a user without the certificate), the privacy
hint and the disclaimer, plus the workspace picker, pinned skills, unread tabs
and onboarding hint when their data is passed. It fills the rest of its
positioned, column-flex parent, so the host places its page header above it
in the same frame.

Sending starts the chat: the package creates it (with the selected workspace,
or an onboarding origin), uploads its files, attaches the passed knowledge
bases and integrations, and hands the first message to the lifecycle, held
while the files process. Creation uses the generated create-thread mutation
key and settles once the chat can take its message. Failures are shown as
toasts. Then `events.onThreadStarted` reports the chat; its `settled` promise
resolves once the new chat's settle animation has played (`true`) or after the
user stopped the start (`false`), so a host can open the chat at once or after
settling. The screen stays settled until the host replaces it. `stopChatStart`
stops a draft's start in progress, e.g. when the host navigates away.

`NewChatComposer` is the composer alone, for a page that embeds one: it starts
the chat the same way, with a fixed `workspaceId` and `origin`, and without
settling.

## Conversation

Render `Conversation` from `@ayunis/chat/surface` with the surface's
`ChatConfig` and a `threadId`. The package loads the thread (polling while a
file processes), the server's runs in progress, file-processing progress and
citations through `@ayunis/api-client`, and renders the whole screen:

- the header with the title, the anonymous badge, the ⋮ menu with Rename and
  Delete, the sidebar toggle when the chat sits inside a `@ayunis/ui`
  `SidebarProvider`, and the controls of the passed optional data. `layout:
  'narrow'` keeps the header on one row;
- the timeline with copy, read aloud (following the instance's
  `readAloudEnabled`), message images loaded with the configured transport,
  routine nudges, the citation dialog, PII reveal through the unmask endpoint,
  the response-start orb and the per-file processing rows;
- the composer. A sent message leaves the composer at once and shows as
  pending; one that fails comes back into it. While a file of the chat is
  processing, a message waits for it and Stop takes it back. A host can keep
  waiting messages beyond a reload with the lifecycle's `waitingMessages`
  storage.

Pass `Conversation` the same run `lifecycle` as `NewChat`, so it takes over a
new chat's first message; otherwise the conversation owns one per
`sessionKey`. Use
`onRunSettled` to refresh host caches, including for turns that finish after
the user navigates away, and `observeRun` for host analytics, authentication
recovery and translated transport errors. The package remains the only owner
of run execution, event routing, cancellation, reattach, and first-message
handoff. Hosts provide the translation resources and import the package styles
through their Tailwind stylesheet.

Client tools can register an executor, a custom card, or both by tool name.
The shared lifecycle coordinates execution and routes results to the run.
The host supplies the executor invocation and its context.

## Supported host entry points

| Entry point | Purpose |
| --- | --- |
| `@ayunis/chat/surface` | `ChatConfig`, the `NewChat` and `Conversation` screens, the embedded new-chat composer, surface shell, slots, and client-tool registration |
| `@ayunis/chat/runs` | Transport contracts and the shared session lifecycle used for pre-navigation handoff |
| `@ayunis/chat/new-chat` | The new-chat backdrop, for a host page in its place (e.g. without a model) |
| `@ayunis/chat/notifications` | Notification type icons, appearance and unread-count formatting |
| `@ayunis/chat/history` | Canonical history list, rows, states, pagination, rename, and delete presentation |
| `@ayunis/chat/model-presentation` | Canonical selector hierarchy, modes, model metadata, and shared notices |
| `@ayunis/chat/attachments` | Canonical source, knowledge-base, and integration badges |
| `@ayunis/chat/messages`, `@ayunis/chat/timeline`, `@ayunis/chat/tool-cards` | Message/timeline rendering and registered rich tool cards |
| `@ayunis/chat/markdown` | Markdown, citations, PII reveal, and legal-reference presentation |
| `@ayunis/chat/workspaces` | Workspace icons, appearance catalogue, and picker menu body |

Internal files under `packages/chat/src` are not host APIs. The package does not
export a generic configured-history wrapper or a composer replacement slot;
hosts compose routing and queries around the canonical public primitives.
