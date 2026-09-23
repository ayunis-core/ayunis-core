/**
 * SDK-level retry count for non-streaming inference. These handlers retain
 * their established provider-owned retry behavior as a deliberate exception.
 */
export const INFERENCE_MAX_RETRIES = 3;

/**
 * Streaming provider SDKs must not retry internally. Retry ownership belongs
 * exclusively to RuntimeStreamInferenceHandler for direct streams and
 * RuntimeModelProviderDecorator for agent-runtime streams.
 */
export const STREAMING_PROVIDER_MAX_RETRIES = 0;

/**
 * Output-token budget for the Claude handlers — both the direct Anthropic API
 * and Anthropic-on-Bedrock (AYC-674). The provider's `DEFAULT_MAX_TOKENS`
 * (16_384) is too low for large tool-call outputs: a long `create_document`
 * payload hit the cap mid-call, so the model stopped with finishReason
 * 'length', the truncated arguments failed the integrity check, every retry
 * hit the same wall, and generation fell back to plain text.
 *
 * 32_000 is the maximum output supported by Claude Opus (Sonnet 4.5 allows
 * more), so it is the safe ceiling shared across the modern Claude models
 * these handlers serve. Bedrock reserves `input_tokens + max_tokens` against
 * the account's TPM quota at admission, so this larger budget raises that
 * reservation — an accepted trade-off, because a budget that actually
 * completes the document is worth more than avoiding a rare throttle.
 */
export const CLAUDE_MAX_OUTPUT_TOKENS = 32_000;
