AI Execution
Orchestrate AI inference runs with streaming message responses

Runs execute AI conversations by coordinating model inference, message creation, tool execution, and response streaming. Each run processes user or tool-result input within a thread context.

The runs module is the central orchestrator for AI conversation execution. The `Run` entity (currently minimal) represents an execution instance, while `RunInput` differentiates between `RunUserInput` (text and images) and `RunToolResultInput` (tool call responses). The primary use case `ExecuteRun` is a thin orchestrator that delegates to focused services. `ExecuteRunAndSetTitle` extends this to auto-generate thread titles on first messages.

### Services

- **ToolAssemblyService** — Assembles available tools and builds the run context (system prompt instructions) from thread, agent, active skills, always-on skill templates, and model capabilities. Builds a unified slug map (`user__<slug>` for user skills, `system__<slug>` for always-on templates) that is passed to both the system prompt builder and the `ActivateSkillTool` entity.
- **ToolResultCollectorService** — Collects tool results from the previous iteration: dispatches backend tool executions, handles frontend tool display acknowledgements, anonymizes PII results, and truncates oversized outputs.
- **StreamingInferenceService** — Executes streaming inference, accumulates response chunks into partial `AssistantMessage` updates, and persists the final result. Handles usage collection from streaming chunks.
- **CollectUsageAsyncService** — Collects usage data asynchronously (fire-and-forget). Errors are logged but don't block the main flow.
- **CreditBudgetGuardService** — Orchestrates a pre-run credit-budget check by combining `GetMonthlyCreditLimitUseCase` (from subscriptions) and `GetMonthlyCreditUsageUseCase` (from usage). Throws `CreditBudgetExceededError` when the organization's monthly credit limit is reached. Lives in the runs module because it is the run execution flow that needs this cross-domain decision.
- **MessageCleanupService** — Ensures threads end with a valid assistant message after a run completes or is interrupted by deleting trailing non-assistant messages and assistant messages with orphaned `tool_use` content (tool calls without corresponding tool results).
- **SystemPromptBuilderService** — Builds system prompts from agent configuration, thread context, and active skills. Accepts `SkillEntry[]` (slug + description) instead of `Skill[]` — the slug is used as the skill name in the prompt.

### Helpers

- **resolve-integration.helper.ts** — Pure functions for resolving MCP integration metadata. `resolveIntegration` matches tool names to `McpIntegrationTool` instances and extracts integration metadata. `enrichContentWithIntegration` attaches integration metadata to `ToolUseMessageContent` blocks in assistant responses.
- **skill-slug.ts** — Located in `src/common/util/`. Pure functions for slugifying skill names (`slugify` with German transliteration), building prefixed slugs (`buildSkillSlug`), parsing slugs back to prefix + slug (`parseSkillSlug`), and building collision-safe slug→name maps (`buildSlugMap`). Defines `SYSTEM_PREFIX` (`system`) and `USER_PREFIX` (`user`) constants.

Note: **SkillActivationService** (which handles copying skill sources, MCP integrations, and returning instructions to the thread) lives in the **skills module** (`src/domain/skills/application/services/skill-activation.service.ts`) and is consumed by both the runs module (`ExecuteRunUseCase`) and the tools module (`ActivateSkillToolHandler`).

The module integrates with **threads** for conversation context, **messages** for creating and reading conversation history, **models** for inference routing, **tools** for executing tool calls during runs, **agents** for loading agent configurations, **skills** for on-demand skill activation and source/MCP injection, **mcp** for fetching integration metadata (`GetMcpIntegrationsByIdsUseCase`, `MarketplaceMcpIntegration`), **usage** for tracking token consumption, **chat-settings** for user-level system prompt injection, **artifacts** for discovering thread artifacts during tool assembly, and **subscriptions** for credit budget enforcement (`GetMonthlyCreditLimitUseCase`, with `CreditBudgetExceededError` re-exported from `runs.errors.ts` for backward compatibility).
