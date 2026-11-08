import { useCallback, useEffect, useRef } from 'react';
import { isThreadRunStopped, useActiveThreadRuns } from '@/features/thread-run';

interface UseThreadRunReattachParams {
  threadId: string;
  isStreaming: boolean;
  attach: () => Promise<void>;
}

interface ThreadRunState {
  threadId: string;
  wasStreaming: boolean;
  localRunEndedAt: number;
  attachFailed: boolean;
}

/**
 * Runs continue on the server without this page, so a chat opened while its
 * run is in progress (after a reload, from another tab, or a routine run)
 * attaches to it. A list fetched before this page's own run ended, or one
 * still showing a run the user stopped, is not a reason to attach. A failed
 * attach is not retried while the run stays listed.
 */
export function useThreadRunReattach({
  threadId,
  isStreaming,
  attach,
}: UseThreadRunReattachParams) {
  const { runsByThreadId, dataUpdatedAt } = useActiveThreadRuns();
  const run = runsByThreadId.get(threadId);
  const stateRef = useRef<ThreadRunState>(freshState(threadId, isStreaming));
  // The chat page stays mounted when switching chats, so what it remembers
  // about the previous chat's run must not carry over.
  const stateFor = useCallback(
    (current: string, streaming: boolean): ThreadRunState => {
      if (stateRef.current.threadId !== current) {
        stateRef.current = freshState(current, streaming);
      }
      return stateRef.current;
    },
    [],
  );

  useEffect(() => {
    const state = stateFor(threadId, isStreaming);
    if (state.wasStreaming && !isStreaming) {
      state.localRunEndedAt = Date.now();
    }
    state.wasStreaming = isStreaming;
  }, [threadId, isStreaming, stateFor]);

  useEffect(() => {
    const state = stateFor(threadId, isStreaming);
    if (!run) {
      state.attachFailed = false;
      return;
    }
    if (isStreaming || state.attachFailed || isThreadRunStopped(threadId)) {
      return;
    }
    if (dataUpdatedAt <= state.localRunEndedAt) return;
    attach().catch((error: unknown) => {
      console.error('Failed to attach to the run in progress', error);
      state.attachFailed = true;
    });
  }, [threadId, run, isStreaming, dataUpdatedAt, attach, stateFor]);

  return { isRunCancellable: run?.cancellable ?? true };
}

function freshState(threadId: string, isStreaming: boolean): ThreadRunState {
  return {
    threadId,
    wasStreaming: isStreaming,
    localRunEndedAt: 0,
    attachFailed: false,
  };
}
