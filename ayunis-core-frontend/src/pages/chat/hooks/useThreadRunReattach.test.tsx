import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  forgetStoppedThreadRunsExcept,
  isThreadRunStopped,
  markThreadRunStopped,
} from '@/features/thread-run/model/stopped-thread-runs';
import type { ActiveThreadRunResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useThreadRunReattach } from './useThreadRunReattach';

const threadId = '00000000-0000-0000-0000-000000000001';
const otherThreadId = '00000000-0000-0000-0000-000000000002';

const activeRuns = vi.hoisted(() => ({
  current: {
    runsByThreadId: new Map<string, ActiveThreadRunResponseDto>(),
    dataUpdatedAt: 0,
  },
}));
vi.mock('@/features/thread-run', () => ({
  useActiveThreadRuns: () => activeRuns.current,
  isThreadRunStopped: (id: string) => isThreadRunStopped(id),
}));

function listRuns(runs: ActiveThreadRunResponseDto[], dataUpdatedAt: number) {
  activeRuns.current = {
    runsByThreadId: new Map(runs.map((run) => [run.threadId, run])),
    dataUpdatedAt,
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
