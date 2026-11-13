import { useEffect } from 'react';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import {
  getDeferredThreadRun,
  useIsThreadRunDeferred,
  startDeferredThreadRun,
  takeStartedThreadRun,
} from '@/features/thread-run';
import { showError } from '@/shared/lib/toast';
import type { SendMessageInput } from '@/pages/chat/api/useMessageSend';
import {
  clearPendingThreadSubmission,
  startThreadSubmission,
} from '@/pages/chat/model/pending-submissions';

interface UsePendingMessageParams {
  threadId: string;
  /** Whether the chat route loaded the thread with saved messages. */
  loadedMessageCount: number;
  hasProcessingSources: boolean;
  sendTextMessage: (input: SendMessageInput) => Promise<void>;
}

/**
 * A new chat's first message is sent before navigation (see useInitiateChat),
 * after its knowledge bases and integrations were attached. Once ChatPage
 * mounts, this hook takes that started run and streams its response like any
 * other send. A chat started with files arrives with the message deferred
 * instead: it is shown as pending and sent once no file is processing.
 */
export function usePendingMessage({
  threadId,
  loadedMessageCount,
  hasProcessingSources,
  sendTextMessage,
}: UsePendingMessageParams) {
  const { t } = useTranslation('chat');
  const isDeferred = useIsThreadRunDeferred(threadId);

  useEffect(() => {
    const deferredRun = getDeferredThreadRun(threadId);
    if (deferredRun && hasProcessingSources) {
      startThreadSubmission(threadId, {
        text: deferredRun.text,
        images: deferredRun.images.map((image) => image.file),
      });
      return;
    }
    const messageCountBeforeSend = startDeferredThreadRun(threadId) ?? 0;
    const startedRun = takeStartedThreadRun(threadId);
    if (!startedRun) return;

    const { text, images, voiceInput, request } = startedRun;
    startThreadSubmission(threadId, { text, images });
    // The run may have saved the message before the chat route loaded the
    // thread; a pending bubble would then show it twice.
    if (loadedMessageCount > messageCountBeforeSend)
      clearPendingThreadSubmission(threadId);

    void (async () => {
      try {
        await sendTextMessage({ text, startedRequest: request, voiceInput });
      } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 403) {
          showError(t('chat.upgradeToProError'));
        } else {
          showError(t('chat.errorSendMessage'));
        }
      }
    })();
  }, [
    threadId,
    isDeferred,
    loadedMessageCount,
    hasProcessingSources,
    sendTextMessage,
    t,
  ]);
}
