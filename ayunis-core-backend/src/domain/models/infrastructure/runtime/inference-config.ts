/**
 * SDK-level retry count for transient provider failures, passed to every
 * `@ayunis` provider. Set explicitly (rather than relying on the provider
 * default) to preserve the pre-runtime handlers' 3-retry behavior as a
 * deliberate choice.
 */
export const INFERENCE_MAX_RETRIES = 3;

/**
 * Output-token budget for the direct Anthropic API (AYC-674). The provider's
 * `DEFAULT_MAX_TOKENS` (16_384) is deliberately conservative because Bedrock
 * reserves `input_tokens + max_tokens` against the account's TPM quota, so an
 * oversized budget there triggers throttling. The direct Anthropic API has no
 * such admission reservation, and that low cap truncated large tool calls
 * (e.g. a long `create_document` payload) mid-output: the model hit the limit
 * while emitting the tool call, the truncated arguments failed the integrity
 * check, every retry hit the same wall, and generation fell back to plain
 * text. 32_000 is the maximum output supported by Claude Opus (Sonnet 4.5
 * allows more), so it is the safe ceiling shared across the modern Anthropic
 * models this handler serves.
 */
export const ANTHROPIC_MAX_OUTPUT_TOKENS = 32_000;
