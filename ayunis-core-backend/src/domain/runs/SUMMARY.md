AI Execution
Orchestrate AI inference runs with streaming message responses

Runs execute AI conversations by coordinating model inference, message creation, tool execution, and response streaming. Each run processes user or tool-result input within a thread context.

The runs module is the central orchestrator for AI conversation execution. The `Run` entity (currently minimal) represents an execution instance, while `RunInput` differentiates between `RunUserInput` (text and images) and `RunToolResultInput` (tool call responses). The primary use case `ExecuteRun` coordinates the full inference cycle: building system prompts via `SystemPromptBuilderService`, sending messages to the language model, streaming responses, handling tool calls, and saving results. `ExecuteRunAndSetTitle` extends this to auto-generate thread titles on first messages. The module integrates with **threads** for conversation context, **messages** for creating and reading conversation history, **models** for inference routing, **tools** for executing tool calls during runs, **agents** for loading agent configurations, and **usage** for tracking token consumption.
