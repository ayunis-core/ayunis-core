import type { ProviderRejectionReason } from '@ayunis/inference';

const PROMPT_TOO_LONG = 'prompt is too long';

/**
 * Anthropic and Bedrock report an over-long prompt only in prose
 * ("prompt is too long: N tokens > M maximum"), under the generic
 * `invalid_request_error` type, so the wording is the only signal.
 */
export function classifyAnthropicRejection(
  error: unknown,
): ProviderRejectionReason | undefined {
  return providerMessages(error).some((message) =>
    message.toLowerCase().includes(PROMPT_TOO_LONG),
  )
    ? 'context_length_exceeded'
    : undefined;
}

function providerMessages(error: unknown): string[] {
  const record = asRecord(error);
  const body = asRecord(record?.error);
  const nested = asRecord(body?.error);
  return [record?.message, body?.message, nested?.message].filter(
    (message): message is string => typeof message === 'string',
  );
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}
