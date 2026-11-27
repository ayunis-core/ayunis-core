import {
  useCallback,
  useEffect,
  useEffectEvent,
  useSyncExternalStore,
} from 'react';
import { useTranslation } from 'react-i18next';
import type { ChatRunLifecycle } from './run-lifecycle';
import type { ThreadSubmission } from './thread-submissions';
import { showError } from './chat-toasts';

interface ConversationSubmissionOptions {
  readonly threadId: string;
  readonly isStreaming: boolean;
  readonly hasProcessingSources: boolean;
  /** Undefined while no composer can take it back, e.g. without a model. */
  readonly restore: (submission: ThreadSubmission) => boolean | undefined;
  readonly resumeStartedRun: () => boolean;
}

function useDeferred(lifecycle: ChatRunLifecycle, threadId: string) {
  const isDeferred = useCallback(
    () => lifecycle.isThreadRunDeferred(threadId),
    [lifecycle, threadId],
  );
  return useSyncExternalStore(
    lifecycle.subscribeToDeferredThreadRuns,
    isDeferred,
    () => false,
  );
}

function useSubmissionSnapshot<T>(
  lifecycle: ChatRunLifecycle,
  read: () => T,
): T {
  return useSyncExternalStore(lifecycle.subscribeToSubmissions, read, read);
}

/**
 * The sent message until the run confirms it, a message waiting for its
 * files, and a failed message going back into the composer.
 */
export function useConversationSubmission(
  lifecycle: ChatRunLifecycle,
  options: ConversationSubmissionOptions,
) {
  const { threadId, isStreaming } = options;
  const isDeferred = useDeferred(lifecycle, threadId);
  const pending = useSubmissionSnapshot(lifecycle, () =>
    lifecycle.getPendingSubmission(threadId),
  );
  useInterruptedSubmission(lifecycle, threadId);
  useFailedSubmissionRestore(lifecycle, threadId, options.restore);
  useDeferredRunStart(lifecycle, options, isDeferred);
  return {
    isDeferred,
    pendingSubmission: isStreaming || isDeferred ? pending : null,
  };
}

/** A message that waited for its files when the surface reloaded is handed back. */
function useInterruptedSubmission(
  lifecycle: ChatRunLifecycle,
  threadId: string,
) {
  useEffect(() => {
    const text = lifecycle.takeInterruptedThreadRunText(threadId);
    if (text === null) return;
    lifecycle.startSubmission(threadId, { text });
    lifecycle.completeSubmission(threadId, true);
  }, [lifecycle, threadId]);
}

function useFailedSubmissionRestore(
  lifecycle: ChatRunLifecycle,
  threadId: string,
  restore: ConversationSubmissionOptions['restore'],
) {
  const { t } = useTranslation('chat');
  const failed = useSubmissionSnapshot(lifecycle, () =>
    lifecycle.getFailedSubmission(threadId),
  );
  const restoreFailed = useEffectEvent(restore);
  useEffect(() => {
    if (!failed) return;
    const restored = restoreFailed(failed);
    if (restored === undefined) return;
    if (!lifecycle.consumeFailedSubmission(threadId)) return;
    if (!restored) showError(t('chat.errorRestoreFailedSubmission'));
  }, [failed, lifecycle, t, threadId]);
}

/** Sends a waiting message once no file of the chat is processing. */
function useDeferredRunStart(
  lifecycle: ChatRunLifecycle,
  {
    threadId,
    hasProcessingSources,
    resumeStartedRun,
  }: ConversationSubmissionOptions,
  isDeferred: boolean,
) {
  const resume = useEffectEvent(resumeStartedRun);
  useEffect(() => {
    const deferred = lifecycle.getDeferredThreadRun(threadId);
    if (deferred && hasProcessingSources) {
      lifecycle.startSubmission(threadId, {
        text: deferred.text,
        images: deferred.images.map((image) => image.file),
      });
      return;
    }
    if (lifecycle.startDeferredThreadRun(threadId)) resume();
  }, [lifecycle, threadId, isDeferred, hasProcessingSources]);
}
