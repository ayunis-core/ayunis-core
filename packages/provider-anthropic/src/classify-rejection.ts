import type { ProviderRejection } from '@ayunis/inference';

/**
 * Anthropic and Bedrock report these rejections only in prose under the
 * generic `invalid_request_error` type, so the wording is the only signal:
 * "prompt is too long: N tokens > M maximum" and
 * "…image exceeds 5 MB maximum: N bytes > M bytes".
 */
const PROMPT_TOO_LONG =
  /prompt is too long(?::\s*(\d+)\s*tokens\s*>\s*(\d+)\s*maximum)?/i;
const IMAGE_TOO_LARGE = /image exceeds .* maximum/i;

export function classifyAnthropicRejection(
  error: unknown,
): ProviderRejection | undefined {
  const messages = providerMessages(error);
  let promptTooLong = false;
  for (const message of messages) {
    const match = PROMPT_TOO_LONG.exec(message);
    if (!match) continue;
    promptTooLong = true;
    const overflow = contextOverflowTokens(match[1], match[2]);
    if (overflow !== undefined) {
      return {
        reason: 'context_length_exceeded',
        contextOverflowTokens: overflow,
      };
    }
  }
  if (promptTooLong) return { reason: 'context_length_exceeded' };
  if (messages.some((message) => IMAGE_TOO_LARGE.test(message))) {
    return { reason: 'image_too_large' };
  }
  return undefined;
}

function contextOverflowTokens(
  requestTokens: string | undefined,
  maxTokens: string | undefined,
): number | undefined {
  if (requestTokens === undefined || maxTokens === undefined) return undefined;
  const overflow = Number(requestTokens) - Number(maxTokens);
  return Number.isSafeInteger(overflow) && overflow > 0 ? overflow : undefined;
}

function providerMessages(error: unknown): string[] {
  const record = asRecord(error);
  const body = asRecord(record?.error);
  const nested = asRecord(body?.error);
  return [nested?.message, body?.message, record?.message].filter(
    (message): message is string => typeof message === 'string',
  );
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}
