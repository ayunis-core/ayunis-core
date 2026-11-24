import { useCallback, useEffect, useRef } from 'react';
import type { ChatRunLifecycle } from './run-lifecycle';

interface ActiveRunSnapshot {
  readonly run?: { readonly cancellable: boolean };
  readonly dataUpdatedAt: number;
  readonly isFetching: boolean;
}

interface UseThreadRunReattachParams {
  threadId: string;
  isStreaming: boolean;
  attach: () => Promise<void>;
}

interface ThreadRunState {
  threadId: string;
  sessionResetAt: number;
  wasStreaming: boolean;
  localRunEndedAt: number;
  attachFailed: boolean;
}

/**
 * Runs continue on the server without this page, so a chat opened while its
 * run is in progress (after a reload, from another tab, or a routine run)
 * attaches to it. A list fetched before this page's own run ended, or one
 * still showing a run the user stopped, is not a reason to attach. A listing
 * from before a session reset is stale too. A failed
 * attach is not retried while the run stays listed.
 */
export function useThreadRunReattach(
  lifecycle: ChatRunLifecycle,
  { threadId, isStreaming, attach }: UseThreadRunReattachParams,
  { run, dataUpdatedAt, isFetching }: ActiveRunSnapshot,
) {
  const sessionResetAt = lifecycle.getSessionResetAt();
  const stateFor = useThreadRunState(lifecycle, threadId, isStreaming);

  useEffect(() => {
    const state = stateFor(threadId, isStreaming);
    if (!run || dataUpdatedAt <= state.sessionResetAt) {
      state.attachFailed = false;
      return;
    }
    if (
      isStreaming ||
      lifecycle.isThreadRunActive(threadId) ||
      state.attachFailed ||
      lifecycle.isThreadRunStopped(threadId)
    ) {
      return;
    }
    if (dataUpdatedAt <= state.localRunEndedAt) return;
    attach().catch((error: unknown) => {
      console.error('Failed to attach to the run in progress', error);
      state.attachFailed = true;
    });
  }, [
    threadId,
    run,
    isStreaming,
    dataUpdatedAt,
    attach,
    stateFor,
    lifecycle,
    sessionResetAt,
  ]);

  return {
    isRunCancellable:
      dataUpdatedAt <= sessionResetAt || (run?.cancellable ?? true),
    isCheckingForRun: isFetching,
  };
}

function useThreadRunState(
  lifecycle: ChatRunLifecycle,
  threadId: string,
  isStreaming: boolean,
) {
  const sessionResetAt = lifecycle.getSessionResetAt();
  const stateRef = useRef(freshState(threadId, isStreaming, sessionResetAt));
  // The chat page stays mounted when switching chats, so what it remembers
  // about the previous chat's run must not carry over.
  const stateFor = useCallback(
    (current: string, streaming: boolean): ThreadRunState => {
      const resetAt = lifecycle.getSessionResetAt();
      if (
        stateRef.current.threadId !== current ||
        stateRef.current.sessionResetAt !== resetAt
      ) {
        stateRef.current = freshState(current, streaming, resetAt);
      }
      return stateRef.current;
    },
    [lifecycle],
  );

  useEffect(() => {
    const state = stateFor(threadId, isStreaming);
    if (state.wasStreaming && !isStreaming) {
      state.localRunEndedAt = Date.now();
    }
    state.wasStreaming = isStreaming;
  }, [threadId, isStreaming, stateFor]);

  return stateFor;
}

function freshState(
  threadId: string,
  isStreaming: boolean,
  sessionResetAt: number,
): ThreadRunState {
  return {
    threadId,
    sessionResetAt,
    wasStreaming: isStreaming,
    localRunEndedAt: 0,
    attachFailed: false,
  };
}
