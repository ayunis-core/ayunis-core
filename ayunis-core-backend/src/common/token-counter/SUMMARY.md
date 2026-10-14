Token Counting
Text-token counting and conversation context-budget policy.

`CountTokensUseCase` delegates text counting to `TokenCounterRegistry`, which prefers `TiktokenHandler` and falls back to `SimpleHandler`. RAG chunking and usage tracking consume this text-counting API.

The pure policy in `application/util/context-budget.helper.ts` computes a history budget from the configured context window, a tokenizer safety margin, and fixed instruction/tool costs. An unset context window defaults to 200,000 tokens. Providers expose an optional `ModelProvider.tokenEstimator`; known OpenAI model identities use their published text encoding, while unknown deployment identities and other providers use estimates with wider headroom. Image costs remain conservative fixed ceilings, not decoded-image measurements.

`countMessageTokens` prices individual message parts for trimming. `countThreadTokens` batches text into one tokenizer call for the approximate long-chat warning, with image and message costs added separately. The warning threshold is 80% of the context window; unusually large instructions/tools or a provider-specific estimator can still cause trimming before that warning.

`getContextOverflowReductionTokens` supplies additional headroom after a provider rejects a request as too long. The runs module owns complete-turn selection and retry state; it preserves reductions across the run while limiting rejected-request fallback to the current turn. Model-call observability compares the actual final request estimate against provider-reported input usage.
