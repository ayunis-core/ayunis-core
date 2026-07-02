OpenAI-compatible Chat Completions
Stateless POST /api/openai-compat/v1/chat/completions surface compatible with the OpenAI SDK (clients configure `base_url=…/api/openai-compat/v1`)

This module exposes an OpenAI-compatible chat-completions endpoint so external clients can target ayunis with the standard OpenAI SDK. The surface is stateless — no thread persistence, `threadId` is synthesised per request — and authenticated via API key.

The module consumes `ModelsModule` for `GetPermittedLanguageModelsUseCase`, `GetInferenceUseCase`, and `StreamInferenceUseCase`, `RunsModule` for `InferenceUsageGuard` (preflight quota check + post-hoc usage accounting), `AuthorizationModule` for `SubscriptionGuard` (bound at the controller so it runs AFTER `AuthGuard('api-key')` populates `request.user`), and `TrialsModule` for `IncrementTrialMessagesUseCase` (trial message counting that mirrors `RunsController.send-message`). It does not own its own persistence. Cross-module imports of inference port shapes (`StreamInferenceInput`, `InferenceResponse`, chunk types) are an intentional trade-off baselined in `.dependency-cruiser-known-violations.json` for the openai-compat → models edge.

## Controllers

- **ChatCompletionsController** (`presenters/http/chat-completions.controller.ts`): POST `/api/openai-compat/v1/chat/completions` (controller path `openai-compat/v1/chat` + global `api` prefix; SDK clients set `base_url=…/api/openai-compat/v1`) supporting both non-streaming JSON and Server-Sent Events streaming. Authenticated via `@UseGuards(AuthGuard('api-key'), SubscriptionGuard)` (overrides the global `JwtAuthGuard` for this route) with `@RequireSubscription({ type: SubscriptionType.USAGE_BASED })` so only orgs with a usage-based subscription — or remaining trial messages — may call the endpoint. When the gate is satisfied via the trial fallback, the controller fires `IncrementTrialMessagesUseCase` once per completion (fire-and-forget, failures logged but never blocking). Rate-limited at 60 requests/minute per client IP via the global `RateLimitGuard` (production only; the guard short-circuits in non-prod). All orchestration is delegated to the use case; the controller only handles DTO ↔ command conversion, trial accounting, and SSE framing.

## Use Cases

- **ExecuteOpenAIChatCompletionUseCase** (`application/use-cases/execute-openai-chat-completion`): Sole orchestrator on this surface. Resolves the requested model against the caller's org permits, runs `InferenceUsageGuard.preflight`, dispatches to `GetInferenceUseCase` (non-streaming) or `StreamInferenceUseCase` (streaming), and accounts usage via `InferenceUsageGuard.collectUsage`. Streaming usage is recorded via RxJS `finalize()` so totals are summed across chunks and flushed on complete, error, or client unsubscribe (AYC-92 streaming usage-drift fix).

## Mappers

- **OpenAIRequestMapper** (`application/mappers/openai-request.mapper.ts`): Maps the OpenAI request DTO to domain `Message` entities, `ToolSchema[]`, system prompt, and `ModelToolChoice`. Rebuilds the `tool_call_id → name` map per assistant turn (AYC-78 finding I6). Forwards named `tool_choice` as the function name string — provider converters interpret a non-enum string as a named-tool choice.
- **OpenAIResponseMapper** (`application/mappers/openai-response.mapper.ts`): Converts an `InferenceResponse` into the OpenAI `chat.completion` shape.
- **OpenAIStreamMapper** (`application/mappers/openai-stream.mapper.ts`): Converts a domain stream chunk into an OpenAI `chat.completion.chunk`, dropping empty/thinking-only/usage-only chunks (returns `null`, filtered upstream).
- **OpenAIErrorMapper** (`application/mappers/openai-error.mapper.ts`): Converts domain errors to OpenAI-style error response bodies.

## Filters

- **OpenAIExceptionFilter** (`presenters/http/filters/openai-exception.filter.ts`): A global `@Catch()` filter, registered both controller-scoped (via `@UseFilters` on `ChatCompletionsController`) and as an `APP_FILTER` so it also intercepts errors raised before the controller dispatches (e.g. Nest body-parser `BadRequestException` for malformed JSON). For `/api/openai-compat/` requests it wraps thrown domain errors into OpenAI-compatible HTTP error responses (JSON envelope pre-stream, or a final SSE `data:` frame mid-stream) so SDK clients see the shape they expect. Because this global filter is registered after `AppModule`'s `ApplicationErrorFilter` `APP_FILTER` and thus wins global filter selection for every route, non–openai-compat requests are explicitly delegated to the injected `ApplicationErrorFilter` (not `super.catch`) to preserve the app-wide `{code, message}` error shape.
- **ApplicationErrorFilter** (`src/common/filters/application-error.filter.ts`): Not owned by this module — provided here only so it can be injected into `OpenAIExceptionFilter` for the non-compat delegation path described above.
