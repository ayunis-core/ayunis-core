import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { useChatContext } from '@/shared/contexts/chat/useChatContext';
import { showError } from '@/shared/lib/toast';
import type { ChatInputRef } from '@/widgets/chat-input/ui/ChatInput';
import type { PendingImage } from '../api/useMessageSend';

interface UsePendingMessageParams {
  sendTextMessage: (params: {
    text: string;
    images?: PendingImage[];
    skillId?: string;
  }) => Promise<void>;
  createFileSourceAsync: (params: { file: File }) => unknown;
  resetCreateFileSourceMutation: () => void;
  addKnowledgeBaseAsync: (id: string) => Promise<unknown>;
  chatInputRef: RefObject<ChatInputRef | null>;
}

export function usePendingMessage({
  sendTextMessage,
  createFileSourceAsync,
  resetCreateFileSourceMutation,
  addKnowledgeBaseAsync,
  chatInputRef,
}: UsePendingMessageParams) {
  const { t } = useTranslation('chat');
  const processedPendingMessageRef = useRef<string | null>(null);
  const [isProcessingPendingSources, setIsProcessingPendingSources] =
    useState(false);

  const {
    pendingMessage,
    setPendingMessage,
    sources,
    setSources,
    pendingImages,
    setPendingImages,
    pendingKnowledgeBases,
    setPendingKnowledgeBases,
    pendingSkillId,
    setPendingSkillId,
  } = useChatContext();

  useEffect(() => {
    async function uploadPendingSources() {
      if (sources.length === 0) return;
      setIsProcessingPendingSources(true);
      const promises = sources.map((source) =>
        createFileSourceAsync({ file: source.file }),
      );
      await Promise.all(promises as Promise<unknown>[]);
      resetCreateFileSourceMutation();
    }

    async function attachPendingKnowledgeBases() {
      if (pendingKnowledgeBases.length === 0) return;
      const results = await Promise.allSettled(
        pendingKnowledgeBases.map((kb) => addKnowledgeBaseAsync(kb.id)),
      );
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        console.error(
          `Failed to attach ${String(failed.length)} knowledge base(s)`,
        );
      }
    }

    function buildPendingImages(): PendingImage[] | undefined {
      if (pendingImages.length === 0) return undefined;
      return pendingImages.map((img) => ({
        file: img.file,
        altText: img.altText ?? (img.file.name || 'Pasted image'),
      }));
    }

    async function sendPendingMessage() {
      if (
        !pendingMessage ||
        processedPendingMessageRef.current === pendingMessage
      ) {
        return;
      }
      processedPendingMessageRef.current = pendingMessage;
      try {
        await uploadPendingSources();
        setSources([]);
        await attachPendingKnowledgeBases();
        await sendTextMessage({
          text: pendingMessage,
          images: buildPendingImages(),
          skillId: pendingSkillId,
        });
      } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 403) {
          showError(t('chat.upgradeToProError'));
        } else {
          showError(t('chat.errorSendMessage'));
        }
        chatInputRef.current?.setMessage(pendingMessage);
      } finally {
        setIsProcessingPendingSources(false);
        setPendingMessage('');
        setPendingImages([]);
        setPendingKnowledgeBases([]);
        setPendingSkillId(undefined);
      }
    }
    void sendPendingMessage();
  }, [
    pendingMessage,
    sendTextMessage,
    setPendingMessage,
    sources,
    createFileSourceAsync,
    setSources,
    pendingImages,
    setPendingImages,
    pendingKnowledgeBases,
    setPendingKnowledgeBases,
    pendingSkillId,
    setPendingSkillId,
    addKnowledgeBaseAsync,
    chatInputRef,
    t,
    resetCreateFileSourceMutation,
  ]);

  return {
    pendingMessage,
    sources,
    pendingImages,
    pendingKnowledgeBases,
    pendingSkillId,
    isProcessingPendingSources,
  };
}
