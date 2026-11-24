import { QueryClient } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getFailedThreadSubmission,
  resetThreadSubmission,
  cancelDeferredThreadRun,
  deferThreadRun,
  setThreadRunPrincipal,
} from '@/features/thread-run';

import { getChatInputSubmissionState } from '@/widgets/chat-input/model/chatInputSubmissionState';
import { writeWaitingMessage } from '@/shared/lib/waiting-message-storage';
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

  it('clears pending text and failed submissions when the principal changes', () => {
    const cache = new QueryClient();
    const { result } = renderHook(() =>
      useThreadSubmissionState({
        threadId: threadA,
        isStreaming: true,
        restoreFailedSubmission: vi.fn(),
        onRestoreBlocked: vi.fn(),
      }),
    );
    act(() => setThreadRunPrincipal('account-a', 'organization', cache));
    act(() => {
      result.current.startSubmission(threadA, { text: 'In flight' });
      result.current.startSubmission(threadB, { text: 'Failed earlier' });
      result.current.completeSubmission(threadB, true);
    });

    act(() => setThreadRunPrincipal('account-a', 'organization', cache));
    expect(result.current.pendingSubmission).toBe('In flight');
    expect(getFailedThreadSubmission(threadB)?.text).toBe('Failed earlier');

    act(() => setThreadRunPrincipal('account-b', 'organization', cache));

    expect(result.current.pendingSubmission).toBeNull();
    expect(getFailedThreadSubmission(threadB)).toBeNull();
  });

  it.each(['Summarise the minutes', ''])(
    'keeps the composer submitting while the message %j waits for its files',
    (text) => {
      const { result } = renderHook(() =>
        useThreadSubmissionState({
          threadId: threadA,
          isStreaming: false,
          restoreFailedSubmission: vi.fn(),
          onRestoreBlocked: vi.fn(),
        }),
      );

      act(() => {
        result.current.startSubmission(threadA, { text });
        deferThreadRun({ threadId: threadA, text, images: [] });
      });

      expect(
        getChatInputSubmissionState(false, result.current.pendingSubmission),
      ).toBe('submitting');
      act(() => {
        cancelDeferredThreadRun(threadA);
      });
    },
  );

  it('puts a message that was waiting before a reload back into the input, once', () => {
    setThreadRunPrincipal('account-a', 'organization', new QueryClient());
    writeWaitingMessage(threadA, 'Message A');
    const restoreFailedSubmission = vi.fn().mockReturnValue(true);
    const mount = () =>
      renderHook(() =>
        useThreadSubmissionState({
          threadId: threadA,
          isStreaming: false,
          restoreFailedSubmission,
          onRestoreBlocked: vi.fn(),
        }),
      );

    const { result, unmount } = mount();

    expect(restoreFailedSubmission).toHaveBeenCalledWith({ text: 'Message A' });
    expect(result.current.pendingSubmission).toBeNull();
    unmount();
    mount();
    expect(restoreFailedSubmission).toHaveBeenCalledOnce();
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
