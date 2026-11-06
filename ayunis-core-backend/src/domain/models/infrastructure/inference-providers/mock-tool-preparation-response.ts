import type { ProviderChunk, ProviderRequest } from '@ayunis/inference';

const TOOL_PREPARATION_PROMPT = 'E2E trigger slow tool preparation';
const MAX_PREPARATION_MS = 60_000;

/**
 * Names a create_document call and holds its arguments back until the run is
 * cancelled, so the chat can only show the tool through the runtime's
 * tool_call_started signal.
 */
export function mockToolPreparationResponse(
  request: ProviderRequest,
  userText: string,
): AsyncIterable<ProviderChunk> | null {
  if (userText !== TOOL_PREPARATION_PROMPT) return null;
  return toolPreparationResponse(request.signal);
}

async function* toolPreparationResponse(
  signal?: AbortSignal,
): AsyncIterable<ProviderChunk> {
  yield {
    toolCallDeltas: [
      { index: 0, id: 'mock-tool-preparation', name: 'create_document' },
    ],
  };
  await waitForAbort(signal, MAX_PREPARATION_MS);
  yield {
    toolCallDeltas: [
      {
        index: 0,
        argumentsDelta: JSON.stringify({
          title: 'Vorbereiteter Bericht',
          content: '<p>Bereit</p>',
        }),
      },
    ],
    finishReason: 'tool_calls',
    usage: { inputTokens: 0, outputTokens: 0 },
  };
}

function waitForAbort(
  signal: AbortSignal | undefined,
  maxMs: number,
): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, maxMs);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}
