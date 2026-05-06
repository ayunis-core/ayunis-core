import { useEffect, useRef } from 'react';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { useChatContext } from '@/shared/contexts/chat/useChatContext';
import { showError } from '@/shared/lib/toast';
import type { PendingImage } from '../api/useMessageSend';

interface UsePendingMessageParams {
  sendTextMessage: (params: {
    text: string;
    images?: PendingImage[];
    skillId?: string;
  }) => Promise<void>;
}

/**
 * After redirect from the new-chat page, ChatPage mounts with a pending
 * message stashed in chat context. This hook fires once on mount, sends
 * the message, and clears the context. Source uploads, knowledge-base
 * attachment, and source-processing waits all happen *before* navigation
 * (see useInitiateChat) — by the time we get here the thread is already
 * fully prepared.
 */
export function usePendingMessage({
  sendTextMessage,
}: UsePendingMessageParams) {
  const { t } = useTranslation('chat');
  const sentRef = useRef(false);
  const {
    pendingMessage,
    setPendingMessage,
    pendingImages,
    setPendingImages,
    pendingSkillId,
    setPendingSkillId,
  } = useChatContext();

  useEffect(() => {
    if (!pendingMessage || sentRef.current) return;
    sentRef.current = true;

    const text = pendingMessage;
    const images: PendingImage[] | undefined =
      pendingImages.length > 0
        ? pendingImages.map((img) => ({
            file: img.file,
            altText: img.altText ?? (img.file.name || 'Pasted image'),
          }))
        : undefined;
    const skillId = pendingSkillId;

    setPendingMessage('');
    setPendingImages([]);
    setPendingSkillId(undefined);

    void (async () => {
      try {
        await sendTextMessage({ text, images, skillId });
      } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 403) {
          showError(t('chat.upgradeToProError'));
        } else {
          showError(t('chat.errorSendMessage'));
        }
      }
    })();
  }, [
    pendingMessage,
    pendingImages,
    pendingSkillId,
    sendTextMessage,
    setPendingMessage,
    setPendingImages,
    setPendingSkillId,
    t,
  ]);
}
