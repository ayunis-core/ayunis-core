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
 * Models that think by default (Opus 5.5, Sonnet 5) can also spend a large
 * part of the budget on thinking. Production calls still reached 64_000 and
 * truncated tool input, so use the verified newer models' full 128K output
 * capacity (AYC-1863). Older Claude families retain the previous 64K ceiling
 * because they reject larger values. Bedrock reserves `input_tokens +
 * max_tokens` against the account's TPM quota at admission, so keep these
 * ceilings explicit and review them alongside deployed quotas when models
 * change.
 */
const CLAUDE_EXTENDED_OUTPUT_MODEL =
  /claude-(?:(?:opus|sonnet)-[5-9]|(?:opus|sonnet)-4-[6-9])(?!\d)/;

export const claudeMaxOutputTokens = (model: string): number =>
  CLAUDE_EXTENDED_OUTPUT_MODEL.test(model) ? 128_000 : 64_000;
