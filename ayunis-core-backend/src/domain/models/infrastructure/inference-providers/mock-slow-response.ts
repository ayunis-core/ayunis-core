import type { ProviderChunk } from '@ayunis/inference';

const SLOW_RESPONSE_PROMPT = 'E2E slow response';
const SLOW_RESPONSE_MS = 10_000;

/**
 * Holds the response back while the last user message carries the trigger
 * (a recording summary's input names its recording), so a test can act while
 * a background model call is running.
 */
export function mockSlowResponse(
  userText: string,
  response: AsyncIterable<ProviderChunk>,
): AsyncIterable<ProviderChunk> {
  return userText.includes(SLOW_RESPONSE_PROMPT)
    ? slowResponse(response)
    : response;
}

async function* slowResponse(
  response: AsyncIterable<ProviderChunk>,
): AsyncIterable<ProviderChunk> {
  await new Promise((resolve) => setTimeout(resolve, SLOW_RESPONSE_MS));
  yield* response;
}
