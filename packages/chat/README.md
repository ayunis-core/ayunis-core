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
  The configured composer inside `Conversation` and `NewChatComposer` from
  `@ayunis/chat/surface` adds the canonical Web-derived toolbar, model picker,
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

`@ayunis/chat/surface` provides the `Conversation` screen, the new-chat
composer, scrolling shell, run lifecycle, and the `ChatConfig` contract. Hosts
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
- `workspaces` (Move to workspace in the header menu, with `create` opening the
  host's own creation), `favorites` (the pin), `artifactPanel` (its header
  button), `contextHint` (the summary before the first message and the action
  that opens it), `trail` (the breadcrumbs before the title, as navigation
  targets) and `newChat` (a New chat button in the header): conversation
  features shown only when their data is passed.
- `toolCards` and `clientTools`: the rich-card and client-tool registries.
- `events`: `onNewChat` (the notices' New chat action), `onNavigate` and
  `hrefFor` (links that leave the chat: the academy, the trail, a chat's
  origin and a cited recording; without `onNavigate` they are not shown),
  `onOpenArtifact`, `onThreadState` (the chat's live messages and masks),
  `onThreadDeleted`, `onRunError`, `onRunSettled`, `observeRun`,
  `onMessageCopied`, `onCodeCopied`, `onUnauthorized` and `onError`.
- `tourTargets`: `data-tour` names the package puts on its composer, upload,
  voice, send, model and anonymous controls.

The config carries no UI. The composer fetches its shared data itself through
`@ayunis/api-client`, with the transport the host configured through
`configureApiTransport` and the host's `QueryClientProvider`: permitted models
and modes, the default selection and chat-start defaults, the embedding and
academy status, the `voiceEnabled` flag, thread uploads with their progress,
source removal, and transcription. Composer errors are shown as toasts.

`NewChatComposer` is the composer of a chat that doesn't exist yet. It owns the
model and anonymous choice and the queued files; the host starts the chat in
`onStart` and can read the current choice through `onSelectionChange`.

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

Pass the run `lifecycle` when the host starts a new chat's first message
itself (`startThreadRun` or `deferThreadRun`), so the conversation takes it
over; otherwise the conversation owns one per `sessionKey`. Use
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
| `@ayunis/chat/surface` | `ChatConfig`, the `Conversation` screen, new-chat composer, surface shell, slots, and client-tool registration |
| `@ayunis/chat/runs` | Transport contracts and the shared session lifecycle used for pre-navigation handoff |
| `@ayunis/chat/new-chat` | Canonical new-chat shell and presentation primitives |
| `@ayunis/chat/history` | Canonical history list, rows, states, pagination, rename, and delete presentation |
| `@ayunis/chat/model-presentation` | Canonical selector hierarchy, modes, model metadata, and shared notices |
| `@ayunis/chat/attachments` | Canonical source, knowledge-base, and integration badges |
| `@ayunis/chat/messages`, `@ayunis/chat/timeline`, `@ayunis/chat/tool-cards` | Message/timeline rendering and registered rich tool cards |
| `@ayunis/chat/markdown` | Markdown, citations, PII reveal, and legal-reference presentation |
| `@ayunis/chat/workspaces` | Workspace icons, appearance catalogue, and picker menu body |

Internal files under `packages/chat/src` are not host APIs. The package does not
export a generic configured-history wrapper or a composer replacement slot;
hosts compose routing and queries around the canonical public primitives.
