import { useEffect } from 'react';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { takeStartedThreadRun } from '@/features/thread-run';
import { showError } from '@/shared/lib/toast';
import type { SendMessageInput } from '@/pages/chat/api/useMessageSend';
import {
  clearPendingThreadSubmission,
  startThreadSubmission,
} from '@/pages/chat/model/pending-submissions';

interface UsePendingMessageParams {
  threadId: string;
  /** Whether the chat route loaded the thread with saved messages. */
  hasLoadedMessages: boolean;
  sendTextMessage: (input: SendMessageInput) => Promise<void>;
}

/**
 * A new chat's first message is sent before navigation (see useInitiateChat),
 * after its sources, knowledge bases and integrations were attached. Once
 * ChatPage mounts, this hook takes that started run and streams its response
 * like any other send.
 */
export function usePendingMessage({
  threadId,
  hasLoadedMessages,
  sendTextMessage,
}: UsePendingMessageParams) {
  const { t } = useTranslation('chat');

  useEffect(() => {
    const startedRun = takeStartedThreadRun(threadId);
    if (!startedRun) return;

    const { text, images, voiceInput, request } = startedRun;
    startThreadSubmission(threadId, { text, images });
    // The run may have saved the message before the chat route loaded the
    // thread; a pending bubble would then show it twice.
    if (hasLoadedMessages) clearPendingThreadSubmission(threadId);

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
  }, [threadId, hasLoadedMessages, sendTextMessage, t]);
}
