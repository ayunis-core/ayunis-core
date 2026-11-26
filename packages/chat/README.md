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
  `ConfiguredComposer` from `@ayunis/chat/surface` adds the canonical Web-derived
  toolbar, upload menu, prompt recall, paste/drop handling, voice input,
  send/stop lifecycle, and host-fed skill, knowledge-base, and integration menu
  sections. Hosts supply draft storage, model/upload/transcription adapters,
  typed menu data, and narrowly named decorators for host-only behavior such as
  onboarding targets. Import `@ayunis/chat/composer.css` for the styles.
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

`@ayunis/chat/surface` provides the scrolling chat shell and the contracts for
host transport, capabilities, header and empty-state slots, extra actions, and
artifact opening. Hosts import `@ayunis/chat/surface.css` and supply the
conversation content and composer. The header receives the host actions so the
host can place them next to its navigation.

For a configured surface, render `ChatConversation` from
`@ayunis/chat/surface` with the selected thread, transport, and capabilities.
It connects the run lifecycle, composer, history actions, timeline and registered
client tools. Supply a principal-scoped `sessionKey`, plus the following
adapters where the surface supports them.

- Supply the selected thread snapshot and, for rejoin, the active run snapshot
  with its freshness timestamp. Use `onRunSettled` to refresh thread and history
  snapshots, including for turns that finish after the user navigates away. The
  initial active-run lookup gates sending; later background refreshes do not.
- Use `observeRun` for host analytics, authentication recovery, cache refresh,
  and translated transport errors. The package remains the only owner of run
  execution, event routing, cancellation, reattach, and first-message handoff.
- Use `onStartedRun` only to mirror a pre-navigation send into host-owned
  optimistic submission state. File-processing hosts can call
  `resumeStartedRun` after their sources become ready.
- Supply model and attachment operations, voice transcription, and history
  mutations for the capabilities the host enables. A host can provide draft
  storage scoped to the principal. The default keeps drafts in memory for the
  mounted session.
- Use slots for host actions, the package-owned attachment presentation,
  authenticated message images, and data-fed composer menu sections. Core
  composer controls and their hierarchy stay package-owned; hosts may decorate
  named controls but do not replace them. Hosts also provide the translation
  resources and import the package styles through their Tailwind stylesheet.

Client tools can register an executor, a custom card, or both by tool name.
The shared lifecycle coordinates execution and routes results to the run.
The host supplies the executor invocation and its context.
