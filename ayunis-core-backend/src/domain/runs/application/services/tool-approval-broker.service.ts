import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';

export type ToolApprovalDecision = 'approved' | 'declined';
export type ToolApprovalOutcome =
  ToolApprovalDecision | 'timed_out' | 'aborted';

export const TOOL_APPROVAL_TIMEOUT_MS = 10 * 60 * 1000;

interface ToolApprovalKey {
  threadId: UUID;
  toolCallId: string;
}

interface PendingApproval {
  userId: UUID;
  settle(outcome: ToolApprovalOutcome): void;
}

/**
 * Pauses a tool call until the user decides on it in the chat. Pending calls
 * live in process memory: the run that waits and the request that decides
 * must reach the same instance. That holds because a run is bound to its
 * open SSE request, and the request's abort signal releases the wait.
 *
 * Calls are keyed by thread and call id: provider call ids are only unique
 * within one response, so two threads may legitimately see the same id.
 */
@Injectable()
export class ToolApprovalBrokerService {
  private readonly logger = new Logger(ToolApprovalBrokerService.name);
  private readonly pending = new Map<string, PendingApproval>();

  awaitDecision(
    params: ToolApprovalKey & {
      userId: UUID;
      signal?: AbortSignal;
      timeoutMs?: number;
    },
  ): Promise<ToolApprovalOutcome> {
    const { userId, signal, timeoutMs = TOOL_APPROVAL_TIMEOUT_MS } = params;
    // Never log `params` itself: it carries the AbortSignal, whose native
    // getters throw when the log serializer walks them.
    const logContext = {
      threadId: params.threadId,
      toolCallId: params.toolCallId,
    };
    if (signal?.aborted) {
      return Promise.resolve('aborted');
    }
    const key = toKey(params);
    this.releasePrevious(key);
    return new Promise((resolve) => {
      const onAbort = (): void => settle('aborted');
      const timer = setTimeout(() => settle('timed_out'), timeoutMs);
      const settle = (outcome: ToolApprovalOutcome): void => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        if (this.pending.get(key)?.settle === settle) {
          this.pending.delete(key);
        }
        this.logger.log({ ...logContext, outcome }, 'Tool approval settled');
        resolve(outcome);
      };
      signal?.addEventListener('abort', onAbort, { once: true });
      this.pending.set(key, { userId, settle });
      this.logger.log(logContext, 'Tool call awaiting user approval');
    });
  }

  /** False when nothing is pending under that key for this user. */
  decide(
    params: ToolApprovalKey & { userId: UUID; decision: ToolApprovalDecision },
  ): boolean {
    const entry = this.pending.get(toKey(params));
    if (entry?.userId !== params.userId) {
      return false;
    }
    entry.settle(params.decision);
    return true;
  }

  // A second wait under the same key means the earlier run is being
  // replayed; its wait can never be answered any more, so release it.
  private releasePrevious(key: string): void {
    const previous = this.pending.get(key);
    if (previous) {
      this.logger.warn({ key }, 'Replacing a pending tool approval');
      previous.settle('aborted');
    }
  }
}

function toKey({ threadId, toolCallId }: ToolApprovalKey): string {
  return `${threadId}/${toolCallId}`;
}
