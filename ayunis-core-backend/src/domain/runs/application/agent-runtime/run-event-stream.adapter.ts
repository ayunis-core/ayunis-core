import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import type { RunEvent } from '@ayunis/agent-runtime';
import { DEFAULT_MAX_ITERATIONS } from '@ayunis/agent-runtime';
import { ApplicationError } from 'src/common/errors/base.error';
import type { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import {
  RunPiiMasksUpdate,
  type RunStreamItem,
} from '../../domain/run-pii-masks-update.entity';
import {
  RunExecutionFailedError,
  RunMaxIterationsReachedError,
} from '../runs.errors';
import {
  toBackendAssistantMessage,
  toBackendToolResultMessage,
} from './inference-message.mapper';
import { THREAD_PII_MASKS_EVENT } from './masks-event';

/** Accumulates one assistant turn's streamed text/thinking for live display. */
interface StreamingTurn {
  id: UUID;
  text: string;
  thinking: string;
}

/**
 * Folds the runtime's fine-grained `RunEvent` stream into the coarse
 * `RunStreamItem`s the runs SSE presenter already knows how to serialize:
 *
 * - `text_delta`/`thinking_delta` accumulate into a growing `AssistantMessage`
 *   re-yielded per tick (the streaming UX the legacy loop produced);
 * - `assistant_message` yields the authoritative message (tool_use + provider
 *   metadata) under the same id as the streamed one;
 * - `tool_result_message` yields the backend tool-result message;
 * - `custom` mask events become `RunPiiMasksUpdate` (yielded before the message
 *   carrying the tokens, as the client expects);
 * - `error` is captured and thrown only once the stream drains, so the
 *   runtime's `runEnd` hooks still fire before the error surfaces as an SSE
 *   error frame (matching the legacy loop's throw-then-cleanup order);
 * - a `run_end` with a non-`completed` status that emitted no `error` event
 *   (i.e. `aborted`) is likewise surfaced as a throw, so callers route it
 *   through the failure/interruption cleanup path instead of mistaking a
 *   cancelled run for a successful one.
 */
export async function* adaptRunEventsToStream(
  events: AsyncIterable<RunEvent>,
  threadId: UUID,
): AsyncGenerator<RunStreamItem, void, void> {
  const assistant = new AssistantTurnAccumulator(threadId);
  let pendingError: ApplicationError | null = null;
  let aborted = false;

  for await (const event of events) {
    const streamed = assistant.consume(event);
    if (streamed) {
      yield streamed;
      continue;
    }
    if (event.type === 'run_end') {
      aborted = event.status === 'aborted';
      continue;
    }
    const side = toSideStreamItem(event, threadId);
    if (side instanceof ApplicationError) {
      pendingError = side;
    } else if (side) {
      yield side;
    }
  }

  if (pendingError) {
    throw pendingError;
  }
  if (aborted) {
    throw new RunExecutionFailedError('run aborted');
  }
}

/** Maps the assistant-turn events (deltas + the authoritative message). */
class AssistantTurnAccumulator {
  private turn: StreamingTurn | null = null;

  constructor(private readonly threadId: UUID) {}

  consume(event: RunEvent): AssistantMessage | null {
    if (event.type === 'thinking_delta') {
      const turn = this.ensureTurn();
      turn.thinking += event.delta;
      return buildStreamingMessage(turn, this.threadId);
    }
    if (event.type === 'text_delta') {
      const turn = this.ensureTurn();
      turn.text += event.delta;
      return buildStreamingMessage(turn, this.threadId);
    }
    if (event.type === 'assistant_message') {
      const message = toBackendAssistantMessage(
        event.message,
        this.threadId,
        this.turn?.id ?? randomUUID(),
      );
      this.turn = null;
      return message;
    }
    return null;
  }

  private ensureTurn(): StreamingTurn {
    this.turn ??= { id: randomUUID(), text: '', thinking: '' };
    return this.turn;
  }
}

/** Maps the non-assistant events, or an ApplicationError to throw on drain. */
function toSideStreamItem(
  event: RunEvent,
  threadId: UUID,
): RunStreamItem | ApplicationError | null {
  if (event.type === 'tool_result_message') {
    return toBackendToolResultMessage(event.message, threadId);
  }
  if (event.type === 'custom') {
    return event.name === THREAD_PII_MASKS_EVENT
      ? new RunPiiMasksUpdate(event.data as ThreadPiiMask[])
      : null;
  }
  if (event.type === 'error') {
    return mapRunError(event);
  }
  return null;
}

function buildStreamingMessage(
  turn: StreamingTurn,
  threadId: UUID,
): AssistantMessage {
  const content: Array<TextMessageContent | ThinkingMessageContent> = [];
  if (turn.thinking) {
    content.push(new ThinkingMessageContent(turn.thinking));
  }
  if (turn.text) {
    content.push(new TextMessageContent(turn.text));
  }
  return new AssistantMessage({ id: turn.id, threadId, content });
}

function mapRunError(
  event: Extract<RunEvent, { type: 'error' }>,
): ApplicationError {
  if (event.code === 'MAX_ITERATIONS_REACHED') {
    const max = event.details?.maxIterations;
    return new RunMaxIterationsReachedError(
      typeof max === 'number' ? max : DEFAULT_MAX_ITERATIONS,
    );
  }
  return new RunExecutionFailedError(event.message);
}
