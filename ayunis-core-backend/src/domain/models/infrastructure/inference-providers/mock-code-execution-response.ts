import type { ProviderChunk, ProviderRequest } from '@ayunis/inference';

const PROMPT_PREFIX = 'E2E code execution sources: ';
const TOOL_CALL_ID = 'mock-code-execution';

export function mockCodeExecutionResponse(
  request: ProviderRequest,
  userText: string,
): AsyncIterable<ProviderChunk> | null {
  const sourceIds = parseSourceIds(userText);
  if (!sourceIds) return null;
  const result = findToolResult(request);
  return codeExecutionResponse(sourceIds, result);
}

function parseSourceIds(userText: string): string[] | null {
  if (!userText.startsWith(PROMPT_PREFIX)) return null;
  try {
    const value: unknown = JSON.parse(userText.slice(PROMPT_PREFIX.length));
    return Array.isArray(value) &&
      value.every((sourceId) => typeof sourceId === 'string')
      ? value
      : null;
  } catch {
    return null;
  }
}

function findToolResult(request: ProviderRequest): string | null {
  const lastUserIndex = request.messages.findLastIndex(
    (message) => message.role === 'user',
  );
  const part = request.messages
    .slice(lastUserIndex + 1)
    .findLast((message) => message.role === 'tool_result')
    ?.content.find(
      (content) =>
        content.type === 'tool_result' && content.toolCallId === TOOL_CALL_ID,
    );
  return part?.type === 'tool_result' ? part.result : null;
}

async function* codeExecutionResponse(
  sourceIds: string[],
  result: string | null,
): AsyncIterable<ProviderChunk> {
  await new Promise((resolve) => setTimeout(resolve, 40));
  if (result !== null) {
    yield {
      textDelta: `code-execution-result::${result}`,
      finishReason: 'stop',
      usage: { inputTokens: 0, outputTokens: 0 },
    };
    return;
  }
  yield {
    toolCallDeltas: [
      {
        index: 0,
        id: TOOL_CALL_ID,
        name: 'code_execution',
        argumentsDelta: JSON.stringify({
          code: buildCode(sourceIds),
          dataSourceIds: sourceIds,
        }),
      },
    ],
    finishReason: 'tool_calls',
    usage: { inputTokens: 0, outputTokens: 0 },
  };
}

function buildCode(sourceIds: string[]): string {
  return [
    'from pathlib import Path',
    ...sourceIds.map(
      (sourceId) =>
        `print(Path('/execution/files/${sourceId}.csv').read_text())`,
    ),
  ].join('\n');
}
