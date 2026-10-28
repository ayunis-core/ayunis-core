import type { RunEventPayload, ToolCallSnapshot } from '../contracts/event';
import type {
  ModelProvider,
  ProviderChunk,
  ProviderRequest,
} from '../contracts/provider';
import type { ModelCallResult } from './accumulator';

export const hasToolUse = (result: ModelCallResult): boolean =>
  result.message.content.some((content) => content.type === 'tool_use');

export const hasAnswerOrToolUse = (result: ModelCallResult): boolean =>
  result.message.content.some(
    (content) =>
      content.type === 'tool_use' ||
      (content.type === 'text' && content.text.trim().length > 0),
  );

export const openIterator = (
  model: ModelProvider,
  request: ProviderRequest,
): AsyncIterator<ProviderChunk> =>
  model.stream(request)[Symbol.asyncIterator]();

export const closeIterator = async (
  iterator: AsyncIterator<ProviderChunk>,
  awaitCleanup: boolean,
): Promise<void> => {
  let cleanup: Promise<IteratorResult<ProviderChunk>> | undefined;
  try {
    cleanup = iterator.return?.();
  } catch {
    return;
  }
  if (!cleanup) return;
  const observed = cleanup.catch(() => undefined);
  if (awaitCleanup) await observed;
};

export function* toolCallSnapshotEvents(
  snapshots: readonly ToolCallSnapshot[],
): Generator<RunEventPayload> {
  for (const toolCall of snapshots) {
    yield { type: 'tool_call_snapshot', toolCall };
  }
}
