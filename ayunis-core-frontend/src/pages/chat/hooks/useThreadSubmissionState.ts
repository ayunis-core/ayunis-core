import { useEffect, useSyncExternalStore } from 'react';
import {
  takeInterruptedThreadRunText,
  useIsThreadRunDeferred,
  clearPendingThreadSubmission,
  completeThreadSubmission,
  consumeFailedThreadSubmission,
  getFailedThreadSubmission,
  getPendingThreadSubmission,
  resetThreadSubmission,
  startThreadSubmission,
  subscribeToThreadSubmissions,
  type ThreadSubmission,
} from '@/features/thread-run';

interface UseThreadSubmissionStateParams {
  threadId: string;
  isStreaming: boolean;
  restoreFailedSubmission: (
    submission: ThreadSubmission,
  ) => boolean | undefined;
  onRestoreBlocked: () => void;
}

export function useThreadSubmissionState({
  threadId,
  isStreaming,
  restoreFailedSubmission,
  onRestoreBlocked,
}: UseThreadSubmissionStateParams) {
  const pendingSubmission = useSyncExternalStore(
    subscribeToThreadSubmissions,
    () => getPendingThreadSubmission(threadId),
    () => null,
  );
  const isRunDeferred = useIsThreadRunDeferred(threadId);
  const failedSubmission = useSyncExternalStore(
    subscribeToThreadSubmissions,
    () => getFailedThreadSubmission(threadId),
    () => null,
  );

  useEffect(() => {
    const text = takeInterruptedThreadRunText(threadId);
    if (text === null) return;
    startThreadSubmission(threadId, { text });
    completeThreadSubmission(threadId, true);
  }, [threadId]);

  useEffect(() => {
    if (!failedSubmission) return;
    const submission = consumeFailedThreadSubmission(threadId);
    if (!submission) return;
    if (restoreFailedSubmission(submission) === false) onRestoreBlocked();
  }, [failedSubmission, onRestoreBlocked, restoreFailedSubmission, threadId]);

  return {
    pendingSubmission: isStreaming || isRunDeferred ? pendingSubmission : null,
    startSubmission: startThreadSubmission,
    clearPendingSubmission: clearPendingThreadSubmission,
    completeSubmission: completeThreadSubmission,
    failSubmission: (submissionThreadId: string) =>
      completeThreadSubmission(submissionThreadId, true),
    resetSubmission: resetThreadSubmission,
  };
}
