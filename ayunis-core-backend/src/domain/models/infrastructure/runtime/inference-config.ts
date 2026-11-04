/**
 * Provider SDKs must not retry internally: one host call is one upstream
 * call. Agent runs delegate retry, backoff, cancellation, and idle-timeout
 * ownership to @ayunis/agent-runtime; every other caller owns its retries.
 */
export const PROVIDER_SDK_MAX_RETRIES = 0;

/**
 * Output-token budget for the Claude handlers — both the direct Anthropic API
 * and Anthropic-on-Bedrock (AYC-674). The provider's `DEFAULT_MAX_TOKENS`
 * (16_384) is too low for large tool-call outputs: a long `create_document`
 * payload hit the cap mid-call, so the model stopped with finishReason
 * 'length', the truncated arguments failed the integrity check, every retry
 * hit the same wall, and generation fell back to plain text.
 *
 * Models that think by default (Opus 5.5, Sonnet 5) can also spend 32_000
 * tokens on thinking alone and end without an answer (AYC-1574). 64_000 is
 * half their 128K maximum: Bedrock reserves `input_tokens + max_tokens`
 * against the account's TPM quota at admission, so the full maximum would
 * raise that reservation and the worst-case run length further than needed.
 */
export const CLAUDE_MAX_OUTPUT_TOKENS = 64_000;
