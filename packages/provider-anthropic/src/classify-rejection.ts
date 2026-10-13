import type { ProviderRejectionReason } from '@ayunis/inference';

/**
 * Anthropic and Bedrock report these rejections only in prose under the
 * generic `invalid_request_error` type, so the wording is the only signal:
 * "prompt is too long: N tokens > M maximum" and
 * "…image exceeds 5 MB maximum: N bytes > M bytes".
 */
export function classifyAnthropicRejection(
  error: unknown,
): ProviderRejectionReason | undefined {
  const messages = providerMessages(error).map((message) =>
    message.toLowerCase(),
  );
  if (messages.some((message) => message.includes('prompt is too long'))) {
    return 'context_length_exceeded';
  }
  if (
    messages.some(
      (message) =>
        message.includes('image exceeds ') && message.includes(' maximum'),
    )
  ) {
    return 'image_too_large';
  }
  return undefined;
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
