import type { ProviderChunk, ProviderRequest } from '@ayunis/inference';

export function mockCreateFileResponse(
  request: ProviderRequest,
  userText: string,
): AsyncIterable<ProviderChunk> | null {
  const format = /^E2E create file (xml|json|txt)$/.exec(userText)?.[1];
  if (!format) return null;
  const acknowledged = request.messages.some(
    (message) =>
      message.role === 'tool_result' &&
      message.content.some(
        (part) =>
          part.type === 'tool_result' && part.toolCallId === 'mock-create-file',
      ),
  );
  return fileResponse(format, acknowledged);
}

async function* fileResponse(
  format: string,
  acknowledged: boolean,
): AsyncIterable<ProviderChunk> {
  if (acknowledged) {
    yield {
      textDelta: 'file-created::continued',
      finishReason: 'stop',
      usage: { inputTokens: 0, outputTokens: 0 },
    };
    return;
  }
  const args = JSON.stringify({
    filename: `Bürgerbericht.${format}`,
    format,
    content: 'Grüße aus Köln\n',
  });
  yield {
    toolCallDeltas: [
      {
        index: 0,
        id: 'mock-create-file',
        name: 'create_file',
        argumentsDelta: args.slice(0, 20),
      },
    ],
  };
  await new Promise((resolve) => setTimeout(resolve, 200));
  yield {
    toolCallDeltas: [{ index: 0, argumentsDelta: args.slice(20) }],
    finishReason: 'tool_calls',
    usage: { inputTokens: 0, outputTokens: 0 },
  };
}
