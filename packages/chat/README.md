# Ayunis chat

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
  The app supplies input state, controls, and handlers. Import
  `@ayunis/chat/composer.css` for the composer styles.
- `@ayunis/chat/history` renders history lists and entries. The app supplies
  links, row actions, empty states, and pagination.

`@ayunis/chat/surface` provides the scrolling chat shell and the contracts for
host transport, capabilities, header and empty-state slots, extra actions, and
artifact opening. Hosts import `@ayunis/chat/surface.css` and supply the
conversation content and composer. The header receives the host actions so the
host can place them next to its navigation.

Client tools can register an executor, a custom card, or both by tool name.
The host controls when to execute a call and how to return its outcome. This
also allows a host to collect multiple outcomes for a paused turn before
passing them to its endpoint adapter.
