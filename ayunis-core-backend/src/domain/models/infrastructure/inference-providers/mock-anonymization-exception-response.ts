import { randomUUID } from 'crypto';
import type { ProviderChunk, ProviderRequest } from '@ayunis/inference';

const ANONYMIZATION_EXCEPTION_PROMPT = 'E2E anonymization exception: ';
const TOOL_NAME = 'add_anonymization_exception';

/**
 * Proposes the exception given as JSON after the trigger when the run offers
 * the tool, then answers once the call has its result. Without the tool the
 * default reply follows, so a test can tell a user who is not an admin apart.
 */
export function mockAnonymizationExceptionResponse(
  request: ProviderRequest,
  userText: string,
): AsyncIterable<ProviderChunk> | null {
  if (!userText.startsWith(ANONYMIZATION_EXCEPTION_PROMPT)) return null;
  if (!request.tools.some((tool) => tool.name === TOOL_NAME)) return null;
  if (request.messages.at(-1)?.role === 'tool_result') {
    return textResponse('anonymization-exception::proposed');
  }
  return toolCallResponse(
    userText.slice(ANONYMIZATION_EXCEPTION_PROMPT.length),
  );
}

async function* toolCallResponse(
  argumentsJson: string,
): AsyncIterable<ProviderChunk> {
  await new Promise((resolve) => setTimeout(resolve, 40));
  yield {
    toolCallDeltas: [
      {
        index: 0,
        id: `mock-${TOOL_NAME}-${randomUUID()}`,
        name: TOOL_NAME,
        argumentsDelta: argumentsJson,
      },
    ],
    finishReason: 'tool_calls',
    usage: { inputTokens: 0, outputTokens: 0 },
  };
}

async function* textResponse(text: string): AsyncIterable<ProviderChunk> {
  await new Promise((resolve) => setTimeout(resolve, 40));
  yield {
    textDelta: text,
    finishReason: 'stop',
    usage: { inputTokens: 0, outputTokens: 0 },
  };
}
