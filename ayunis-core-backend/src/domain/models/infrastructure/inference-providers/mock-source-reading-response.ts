import type { ProviderChunk, ProviderRequest } from '@ayunis/inference';

const PREFIX = 'E2E read full transcript: ';
const CALL_ID = 'mock-read-transcript-';

export function mockSourceReadingResponse(
  request: ProviderRequest,
  prompt: string,
): AsyncIterable<ProviderChunk> | null {
  if (!prompt.startsWith(PREFIX)) return null;
  const sourceId = prompt.slice(PREFIX.length);
  const lastUser = request.messages.findLastIndex(
    (message) => message.role === 'user',
  );
  const results = request.messages
    .slice(lastUser + 1)
    .flatMap((message) => message.content)
    .filter(
      (part) =>
        part.type === 'tool_result' && part.toolCallId.startsWith(CALL_ID),
    );
  const pages = results.map((part) =>
    part.type === 'tool_result'
      ? (JSON.parse(part.result) as {
          text?: string;
          nextPage?: Record<string, unknown> | null;
        })
      : {},
  );
  const last = pages.at(-1);
  const completed = last?.nextPage === null;
  return sourceReadingResponse(
    completed ? null : (last?.nextPage ?? { sourceId }),
    pages.length,
    pages.map((page) => page.text ?? '').join(''),
  );
}

async function* sourceReadingResponse(
  input: Record<string, unknown> | null,
  page: number,
  text: string,
): AsyncIterable<ProviderChunk> {
  await new Promise((resolve) => setTimeout(resolve, 40));
  if (input === null) {
    yield {
      textDelta: `transcript-complete::${text.length}::${text.slice(-40)}`,
      finishReason: 'stop',
      usage: { inputTokens: 0, outputTokens: 0 },
    };
    return;
  }
  yield {
    toolCallDeltas: [
      {
        index: 0,
        id: `${CALL_ID}${page}`,
        name: 'source_get_text',
        argumentsDelta: JSON.stringify(input),
      },
    ],
    finishReason: 'tool_calls',
    usage: { inputTokens: 0, outputTokens: 0 },
  };
}
