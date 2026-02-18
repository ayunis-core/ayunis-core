AI Execution
Orchestrate AI inference runs with streaming message responses

Runs execute AI conversations by coordinating model inference, message creation, tool execution, and response streaming. Each run processes user or tool-result input within a thread context.

The runs module is the central orchestrator for AI conversation execution. The `Run` entity (currently minimal) represents an execution instance, while `RunInput` differentiates between `RunUserInput` (text and images) and `RunToolResultInput` (tool call responses). The primary use case `ExecuteRun` is a thin orchestrator that delegates to focused services. `ExecuteRunAndSetTitle` extends this to auto-generate thread titles on first messages.

### Domain Events

The module uses domain events (`RunEvent`) to decouple business logic from presentation concerns. The `run-events.ts` file defines typed event interfaces:

- **RunSessionEvent** — Signals session start with streaming status
- **RunMessageEvent** — Wraps a domain `Message` entity for delivery
- **RunErrorEvent** — Captures error details with code and optional metadata
- **RunThreadEvent** — Notifies of thread updates (e.g., title changes)

Use cases yield these domain events, and the controller's `mapEventToResponse` method transforms them into response DTOs using `MessageDtoMapper`.

### Services

- **ToolAssemblyService** — Assembles available tools and builds the run context (system prompt instructions) from thread, agent, active skills, and model capabilities.
- **ToolResultCollectorService** — Collects tool results from the previous iteration: dispatches backend tool executions, handles frontend tool display acknowledgements, anonymizes PII results, and truncates oversized outputs.
- **StreamingInferenceService** — Executes streaming inference, accumulates response chunks into partial `AssistantMessage` updates, and persists the final result. Handles usage collection from streaming chunks.
- **MessageCleanupService** — Ensures threads end with an assistant message after a run completes or is interrupted by deleting trailing non-assistant messages.
- **SystemPromptBuilderService** — Builds system prompts from agent configuration, thread context, and active skills.

The module integrates with **threads** for conversation context, **messages** for creating and reading conversation history, **models** for inference routing, **tools** for executing tool calls during runs, **agents** for loading agent configurations, **skills** for on-demand skill activation and source/MCP injection, **usage** for tracking token consumption, and **chat-settings** for user-level system prompt injection.
