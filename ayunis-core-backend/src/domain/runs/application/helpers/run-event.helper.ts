import type { UUID } from 'crypto';
import {
  ApplicationError,
  INTERNAL_SERVER_ERROR_MESSAGE,
} from 'src/common/errors/base.error';
import type {
  RunErrorEvent,
  RunMasksEvent,
  RunMessageEvent,
  RunSessionEvent,
} from 'src/domain/runs/application/run-events';
import {
  RunPiiMasksUpdate,
  type RunStreamItem,
} from 'src/domain/runs/domain/run-pii-masks-update.entity';

export function runSessionEvent(
  threadId: UUID,
  streaming: boolean,
): RunSessionEvent {
  return {
    type: 'session',
    streaming,
    threadId,
    timestamp: new Date().toISOString(),
  };
}

export function runStreamItemEvent(
  item: RunStreamItem,
  threadId: UUID,
): RunMasksEvent | RunMessageEvent {
  if (item instanceof RunPiiMasksUpdate) {
    return {
      type: 'masks',
      threadId,
      masks: item.masks.map((mask) => ({
        id: mask.id,
        token: mask.token,
        value: mask.value,
        category: mask.category,
        unmasked: mask.unmasked,
      })),
      timestamp: new Date().toISOString(),
    };
  }
  return {
    type: 'message',
    message: item,
    threadId,
    timestamp: new Date().toISOString(),
  };
}

/** 5xx messages and metadata stay server-side. */
export function runErrorEvent(error: unknown, threadId: UUID): RunErrorEvent {
  const clientError =
    error instanceof ApplicationError ? error.toClientResponse() : undefined;
  return {
    type: 'error',
    message: clientError?.message ?? INTERNAL_SERVER_ERROR_MESSAGE,
    threadId,
    timestamp: new Date().toISOString(),
    code: clientError?.code ?? 'EXECUTION_ERROR',
    details: clientError?.metadata,
  };
}
