import { useEffect, useSyncExternalStore } from 'react';
import { useIsThreadRunDeferred } from '@/features/thread-run';
import {
  clearPendingThreadSubmission,
  completeThreadSubmission,
  consumeFailedThreadSubmission,
  getFailedThreadSubmission,
  getPendingThreadSubmission,
  resetThreadSubmission,
  startThreadSubmission,
  subscribeToThreadSubmissions,
  type ThreadSubmission,
} from '@/pages/chat/model/pending-submissions';

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
