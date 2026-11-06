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

/** Names each call once, as soon as the provider does. */
export function* toolCallStartedEvents(
  call: { suppressSnapshots: boolean; startedToolCalls: Set<number> },
  snapshots: readonly ToolCallSnapshot[],
): Generator<RunEventPayload> {
  if (call.suppressSnapshots) return;
  for (const { index, id, name } of snapshots) {
    if (!name?.trim() || call.startedToolCalls.has(index)) continue;
    call.startedToolCalls.add(index);
    yield { type: 'tool_call_started', toolCall: { index, id, name } };
  }
}
