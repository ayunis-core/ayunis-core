import { randomUUID } from 'crypto';
import type { ProviderChunk } from '@ayunis/inference';

const MOCK_USAGE = { inputTokens: 0, outputTokens: 0 } as const;

export async function* mockToolCallResponse(
  callIdPrefix: string,
  name: string,
  args: Record<string, unknown>,
): AsyncIterable<ProviderChunk> {
  await new Promise((resolve) => setTimeout(resolve, 40));
  yield {
    toolCallDeltas: [
      {
        index: 0,
        id: `${callIdPrefix}${randomUUID()}`,
        name,
        argumentsDelta: JSON.stringify(args),
      },
    ],
    finishReason: 'tool_calls',
    usage: MOCK_USAGE,
  };
}

export async function* mockTextResponse(
  text: string,
): AsyncIterable<ProviderChunk> {
  await new Promise((resolve) => setTimeout(resolve, 40));
  yield { textDelta: text, finishReason: 'stop', usage: MOCK_USAGE };
}
