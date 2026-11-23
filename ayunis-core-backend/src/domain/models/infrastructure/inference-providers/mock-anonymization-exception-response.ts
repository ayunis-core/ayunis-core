import { randomUUID } from 'crypto';
import type { ProviderChunk, ProviderRequest } from '@ayunis/inference';
import { mockLoadToolsFirst } from './mock-load-tools-response';

const ANONYMIZATION_EXCEPTION_PROMPT = 'E2E anonymization exception: ';
const TOOL_NAME = 'add_anonymization_exception';
const CALL_ID_PREFIX = `mock-${TOOL_NAME}-`;

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
  const loading = mockLoadToolsFirst(request, TOOL_NAME);
  if (loading) return loading;
  if (!request.tools.some((tool) => tool.name === TOOL_NAME)) return null;
  if (hasOwnResult(request)) {
    return textResponse('anonymization-exception::proposed');
  }
  return toolCallResponse(
    userText.slice(ANONYMIZATION_EXCEPTION_PROMPT.length),
  );
}

function hasOwnResult(request: ProviderRequest): boolean {
  const last = request.messages.at(-1);
  return (
    last?.role === 'tool_result' &&
    last.content.some(
      (part) =>
        part.type === 'tool_result' &&
        part.toolCallId.startsWith(CALL_ID_PREFIX),
    )
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
        id: `${CALL_ID_PREFIX}${randomUUID()}`,
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
