import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  forgetStoppedThreadRunsExcept,
  markThreadRunStopped,
  threadRunLifecycle,
} from '@/features/thread-run/model/thread-run-lifecycle';
import type { ActiveThreadRunResponseDto } from '@ayunis/api-client/schemas';
import {
  createChatRunLifecycle,
  useThreadRunReattach as useRunReattach,
} from '@ayunis/chat/runs';
import { useActiveThreadRuns } from '@/features/thread-run';

function useThreadRunReattach(params: Parameters<typeof useRunReattach>[1]) {
  const { runsByThreadId, dataUpdatedAt, isFetching } = useActiveThreadRuns();
  return useRunReattach(threadRunLifecycle, params, {
    run: runsByThreadId.get(params.threadId),
    dataUpdatedAt,
    isFetching,
  });
}

const threadId = '00000000-0000-0000-0000-000000000001';
const otherThreadId = '00000000-0000-0000-0000-000000000002';

const activeRuns = vi.hoisted(() => ({
  current: {
    runsByThreadId: new Map<string, ActiveThreadRunResponseDto>(),
    dataUpdatedAt: 0,
    isFetching: false,
  },
}));
vi.mock('@/features/thread-run', () => ({
  useActiveThreadRuns: () => activeRuns.current,
  get threadRunLifecycle() {
    return threadRunLifecycle;
  },
}));

function listRuns(
  runs: ActiveThreadRunResponseDto[],
  dataUpdatedAt: number,
  isFetching = false,
) {
  activeRuns.current = {
    runsByThreadId: new Map(runs.map((run) => [run.threadId, run])),
    dataUpdatedAt,
    isFetching,
  };
}

const running = (
  cancellable = true,
  runThreadId = threadId,
): ActiveThreadRunResponseDto => ({
  threadId: runThreadId,
  cancellable,
});

interface ReattachProps {
  streaming: boolean;
  id?: string;
}

function renderReattach(isStreaming = false) {
  const attach = vi.fn().mockResolvedValue(undefined);
  const initialProps: ReattachProps = { streaming: isStreaming };
  const hook = renderHook(
    ({ streaming, id }: ReattachProps) =>
      useThreadRunReattach({
        threadId: id ?? threadId,
        isStreaming: streaming,
        attach,
      }),
    { initialProps },
  );
  return { attach, ...hook };
}

describe(useThreadRunReattach.name, () => {
  beforeEach(() => {
    vi.useRealTimers();
    listRuns([], 0);
  });

  afterEach(() => forgetStoppedThreadRunsExcept(new Set()));

  it('attaches when the thread has a run in progress', () => {
    listRuns([running()], 1_000);

    const { attach } = renderReattach();

    expect(attach).toHaveBeenCalledOnce();
  });

  it('does not attach to a thread without a run', () => {
    const { attach } = renderReattach();

    expect(attach).not.toHaveBeenCalled();
  });

  it('blocks sends only until the first active-run lookup completes', () => {
    listRuns([], 0, true);
    const { result, rerender } = renderReattach();

    expect(result.current.isCheckingForRun).toBe(true);

    listRuns([], 1_000, true);
    rerender({ streaming: false });

    expect(result.current.isCheckingForRun).toBe(false);
  });

  it('blocks sends until the active-run lookup is newer than a session reset', () => {
    vi.useFakeTimers({ now: 5_000 });
    const lifecycle = createChatRunLifecycle({ send: vi.fn() });
    const attach = vi.fn().mockResolvedValue(undefined);
    lifecycle.reset();
    const { result, rerender } = renderHook(
      ({ updatedAt }: Readonly<{ updatedAt: number }>) =>
        useRunReattach(
          lifecycle,
          { threadId, isStreaming: false, attach },
          { dataUpdatedAt: updatedAt, isFetching: true },
        ),
      { initialProps: { updatedAt: 4_000 } },
    );

    expect(result.current.isCheckingForRun).toBe(true);

    rerender({ updatedAt: 6_000 });

    expect(result.current.isCheckingForRun).toBe(false);
  });

  it('does not attach while this page streams the run itself', () => {
    listRuns([running()], 1_000);

    const { attach } = renderReattach(true);

    expect(attach).not.toHaveBeenCalled();
  });

  it('ignores a list fetched before its own run ended', () => {
    vi.useFakeTimers({ now: 5_000 });
    listRuns([running()], 4_000);
    const { attach, rerender } = renderReattach(true);

    rerender({ streaming: false });

    expect(attach).not.toHaveBeenCalled();
  });

  it('attaches again once a newer list still shows the run', () => {
    vi.useFakeTimers({ now: 5_000 });
    listRuns([running()], 4_000);
    const { attach, rerender } = renderReattach(true);
    rerender({ streaming: false });

    listRuns([running()], 8_000);
    rerender({ streaming: false });

    expect(attach).toHaveBeenCalledOnce();
  });

  it('does not attach to a run the user stopped until the server lets it go', () => {
    vi.useFakeTimers({ now: 5_000 });
    listRuns([running()], 1_000);
    const { attach, rerender } = renderReattach(true);

    markThreadRunStopped(threadId);
    rerender({ streaming: false });
    listRuns([running()], 9_000);
    rerender({ streaming: false });
    expect(attach).not.toHaveBeenCalled();

    forgetStoppedThreadRunsExcept(new Set());
    listRuns([running()], 11_000);
    rerender({ streaming: false });
    expect(attach).toHaveBeenCalledOnce();
  });

  it('does not replay a stopped run after leaving its chat and coming back', () => {
    vi.useFakeTimers({ now: 5_000 });
    listRuns([running(), running(true, otherThreadId)], 9_000);
    const { attach, rerender } = renderReattach(true);
    markThreadRunStopped(threadId);
    rerender({ streaming: false });

    rerender({ streaming: false, id: otherThreadId });
    attach.mockClear();
    rerender({ streaming: false, id: threadId });

    expect(attach).not.toHaveBeenCalled();
  });

  it('reports whether the run in progress can be stopped', () => {
    listRuns([running(false)], 1_000);

    const { result } = renderReattach(true);

    expect(result.current.isRunCancellable).toBe(false);
  });

  it('attaches to another chat’s run after leaving a streaming chat', () => {
    vi.useFakeTimers({ now: 5_000 });
    listRuns([running(), running(true, otherThreadId)], 4_000);
    const { attach, rerender } = renderReattach(true);

    rerender({ streaming: false, id: otherThreadId });

    expect(attach).toHaveBeenCalledOnce();
  });

  it('attaches to another chat’s run after stopping this one', () => {
    vi.useFakeTimers({ now: 5_000 });
    listRuns([running(), running(true, otherThreadId)], 4_000);
    const { attach, rerender } = renderReattach(true);
    markThreadRunStopped(threadId);

    rerender({ streaming: false, id: otherThreadId });

    expect(attach).toHaveBeenCalledOnce();
  });

  it('does not retry a failed attach while the run stays listed', async () => {
    vi.useFakeTimers({ now: 5_000 });
    listRuns([running()], 6_000);
    const attach = vi
      .fn()
      .mockRejectedValue(new Error('HTTP error! status: 500'));
    const { rerender } = renderHook(
      ({ updatedAt }: { updatedAt: number }) => {
        listRuns([running()], updatedAt);
        return useThreadRunReattach({ threadId, isStreaming: false, attach });
      },
      { initialProps: { updatedAt: 6_000 } },
    );
    await vi.advanceTimersByTimeAsync(0);

    rerender({ updatedAt: 9_000 });
    rerender({ updatedAt: 12_000 });

    expect(attach).toHaveBeenCalledOnce();
  });
});
