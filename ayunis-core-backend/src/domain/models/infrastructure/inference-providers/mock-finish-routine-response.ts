import type { ProviderChunk, ProviderRequest } from '@ayunis/inference';

const FINISH_ROUTINE_PROMPT = 'E2E finish routine';
const FINISH_ROUTINE_TOOL = 'finish_routine';

/**
 * A routine run whose task starts with the trigger ends at once through
 * finish_routine, like a routine with nothing to report.
 */
export function mockFinishRoutineResponse(
  request: ProviderRequest,
): AsyncIterable<ProviderChunk> | null {
  const offered = request.tools.some(
    (tool) => tool.name === FINISH_ROUTINE_TOOL,
  );
  const task = request.messages
    .find((message) => message.role === 'user')
    ?.content.find((part) => part.type === 'text');
  if (!offered || task?.type !== 'text') return null;
  if (!task.text.startsWith(FINISH_ROUTINE_PROMPT)) return null;
  return finishRoutineResponse();
}

async function* finishRoutineResponse(): AsyncIterable<ProviderChunk> {
  await new Promise((resolve) => setTimeout(resolve, 40));
  yield {
    toolCallDeltas: [
      {
        index: 0,
        id: 'mock-finish-routine',
        name: FINISH_ROUTINE_TOOL,
        argumentsDelta: '{}',
      },
    ],
    finishReason: 'tool_calls',
    usage: { inputTokens: 0, outputTokens: 0 },
  };
}
