import type { ProviderChunk, ProviderRequest } from '@ayunis/inference';

export function mockImageEditResponse(
  request: ProviderRequest,
  userText: string,
): AsyncIterable<ProviderChunk> | null {
  if (userText !== 'E2E edit uploaded image') return null;
  const lastUser = request.messages.findLast(
    (message) => message.role === 'user',
  );
  const text = lastUser?.content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
  const reference = /\[image ref: ([^\]]+)\]/.exec(text ?? '')?.[1];
  if (!reference) return null;
  const acknowledged = request.messages.some(
    (message) =>
      message.role === 'tool_result' &&
      message.content.some(
        (part) =>
          part.type === 'tool_result' && part.toolCallId === 'mock-image-edit',
      ),
  );
  return imageEditResponse(reference, acknowledged);
}

async function* imageEditResponse(
  reference: string,
  acknowledged: boolean,
): AsyncIterable<ProviderChunk> {
  await new Promise((resolve) => setTimeout(resolve, 40));
  if (acknowledged) {
    yield {
      textDelta: 'image-edited::continued',
      finishReason: 'stop',
      usage: { inputTokens: 0, outputTokens: 0 },
    };
    return;
  }
  yield {
    toolCallDeltas: [
      {
        index: 0,
        id: 'mock-image-edit',
        name: 'generate_image',
        argumentsDelta: JSON.stringify({
          prompt: 'Coloring page from mobile photo',
          reference_uploaded_image_ids: [reference],
        }),
      },
    ],
    finishReason: 'tool_calls',
    usage: { inputTokens: 0, outputTokens: 0 },
  };
}
