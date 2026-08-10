/**
 * SDK-level retry count for transient provider failures, passed to every
 * `@ayunis` provider. Set explicitly (rather than relying on the provider
 * default) to preserve the pre-runtime handlers' 3-retry behavior as a
 * deliberate choice.
 */
export const INFERENCE_MAX_RETRIES = 3;

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
