import { useEffect, useEffectEvent } from 'react';
import {
  getDeferredThreadRun,
  useIsThreadRunDeferred,
  startDeferredThreadRun,
  startThreadSubmission,
} from '@/features/thread-run';

interface UsePendingMessageParams {
  threadId: string;
  hasProcessingSources: boolean;
  resumeStartedRun: () => boolean;
}

/**
 * A new chat started with files waits until no source is processing. This hook
 * exposes that Web-owned readiness signal, then hands the already-started run
 * to the shared conversation runtime.
 */
export function usePendingMessage({
  threadId,
  hasProcessingSources,
  resumeStartedRun,
}: UsePendingMessageParams) {
  const isDeferred = useIsThreadRunDeferred(threadId);
  const resume = useEffectEvent(resumeStartedRun);

  useEffect(() => {
    const deferredRun = getDeferredThreadRun(threadId);
    if (deferredRun && hasProcessingSources) {
      startThreadSubmission(threadId, {
        text: deferredRun.text,
        images: deferredRun.images.map((image) => image.file),
      });
      return;
    }
    if (startDeferredThreadRun(threadId)) resume();
  }, [threadId, isDeferred, hasProcessingSources]);
}
