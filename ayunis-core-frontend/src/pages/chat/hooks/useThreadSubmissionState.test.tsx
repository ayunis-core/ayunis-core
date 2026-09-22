import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetThreadSubmission } from '@/pages/chat/model/pending-submissions';
import { useThreadSubmissionState } from './useThreadSubmissionState';

const threadA = 'thread-a';
const threadB = 'thread-b';

describe(useThreadSubmissionState.name, () => {
  afterEach(() => {
    resetThreadSubmission(threadA);
    resetThreadSubmission(threadB);
  });

  it('clears the originating thread pending bubble while another thread is selected', () => {
    const restoreFailedSubmission = vi.fn();
    const onRestoreBlocked = vi.fn();
    const { result, rerender } = renderHook(
      ({ threadId, isStreaming }) =>
        useThreadSubmissionState({
          threadId,
          isStreaming,
          restoreFailedSubmission,
          onRestoreBlocked,
        }),
      { initialProps: { threadId: threadA, isStreaming: true } },
    );

    act(() => result.current.startSubmission(threadA, { text: 'Message A' }));
    expect(result.current.pendingSubmission).toBe('Message A');

    rerender({ threadId: threadB, isStreaming: false });
    act(() => result.current.clearPendingSubmission(threadA));
    rerender({ threadId: threadA, isStreaming: true });

    expect(result.current.pendingSubmission).toBeNull();
  });

  it('restores a failure after the originating chat remounts', () => {
    const staleRestore = vi.fn();
    const onRestoreBlocked = vi.fn();
    const firstMount = renderHook(() =>
      useThreadSubmissionState({
        threadId: threadA,
        isStreaming: true,
        restoreFailedSubmission: staleRestore,
        onRestoreBlocked,
      }),
    );

    act(() =>
      firstMount.result.current.startSubmission(threadA, { text: 'Message A' }),
    );
    const completeSubmission = firstMount.result.current.completeSubmission;
    firstMount.unmount();
    act(() => completeSubmission(threadA, true));
    expect(staleRestore).not.toHaveBeenCalled();

    const currentRestore = vi.fn().mockReturnValue(true);
    renderHook(() =>
      useThreadSubmissionState({
        threadId: threadA,
        isStreaming: false,
        restoreFailedSubmission: currentRestore,
        onRestoreBlocked,
      }),
    );

    expect(currentRestore).toHaveBeenCalledWith({ text: 'Message A' });
    expect(currentRestore).toHaveBeenCalledOnce();
  });
});
