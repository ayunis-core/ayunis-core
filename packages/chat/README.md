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
  The app supplies callbacks through the existing citation and mask providers.
- `@ayunis/chat/composer` renders the composer field and attachment previews.
  The configured composer inside `ChatConversation` and `NewChatComposer` from
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

`@ayunis/chat/surface` provides the configured conversation, the new-chat
composer, scrolling shell, run lifecycle, and the `ChatConfig` contract. Hosts
import `@ayunis/chat/surface.css`; they do not supply replacement conversation or
composer renderers. The header receives host actions so the host can place them
next to its navigation.

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
- `toolCards` and `clientTools`: the rich-card and client-tool registries.
- `events`: `onNewChat` (the notices' New chat action), `onNavigate` (links that
  leave the chat, such as the academy; without it they are not shown),
  `onRunSettled`, `observeRun`, `onMessageCopied`, `onCodeCopied`,
  `onUnauthorized` and `onError`.
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

For a configured surface, render `ChatConversation` from
`@ayunis/chat/surface` with the selected thread and the surface's `ChatConfig`.
It connects the run lifecycle, composer, history actions, timeline and registered
client tools. Supply the following where the surface supports them.

- Supply the selected thread snapshot and, for rejoin, the active run snapshot
  with its freshness timestamp. Use `onRunSettled` to refresh thread and history
  snapshots, including for turns that finish after the user navigates away. The
  initial active-run lookup gates sending; later background refreshes do not.
- Use `observeRun` for host analytics, authentication recovery, cache refresh,
  and translated transport errors. The package remains the only owner of run
  execution, event routing, cancellation, reattach, and first-message handoff.
- Use `onStartedRun` only to mirror a pre-navigation send into host-owned
  optimistic submission state. File-processing hosts may defer a send while
  their context is processing, then call `resumeStartedRun` on the narrow
  `ChatConversationHandle` after starting the shared lifecycle handoff.
- Use slots for host actions, the header, the context hint, authenticated
  message images and routine nudges. Hosts also provide the translation
  resources and import the package styles through their Tailwind stylesheet.

Client tools can register an executor, a custom card, or both by tool name.
The shared lifecycle coordinates execution and routes results to the run.
The host supplies the executor invocation and its context.

## Supported host entry points

| Entry point | Purpose |
| --- | --- |
| `@ayunis/chat/surface` | `ChatConfig`, configured conversation, new-chat composer, surface shell, adapters, slots, and client-tool registration |
| `@ayunis/chat/runs` | Transport contracts and the shared session lifecycle used for pre-navigation handoff |
| `@ayunis/chat/new-chat` | Canonical new-chat shell and presentation primitives |
| `@ayunis/chat/history` | Canonical history list, rows, states, pagination, rename, and delete presentation |
| `@ayunis/chat/model-presentation` | Canonical selector hierarchy, modes, model metadata, and shared notices |
| `@ayunis/chat/attachments` | Canonical source, knowledge-base, and integration badges |
| `@ayunis/chat/messages`, `@ayunis/chat/timeline`, `@ayunis/chat/tool-cards` | Message/timeline rendering and registered rich tool cards |
| `@ayunis/chat/markdown` | Markdown, citations, PII reveal, and legal-reference presentation |

Internal files under `packages/chat/src` are not host APIs. The package does not
export a generic configured-history wrapper or a composer replacement slot;
hosts compose routing and queries around the canonical public primitives.
