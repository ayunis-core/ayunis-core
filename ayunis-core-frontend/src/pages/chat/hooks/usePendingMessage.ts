import type { RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { useChatContext } from '@/shared/contexts/chat/useChatContext';
import { showError } from '@/shared/lib/toast';
import type { ChatInputRef } from '@/widgets/chat-input/ui/ChatInput';
import type { PendingImage } from '../api/useMessageSend';
import { SourceResponseDtoStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';

const PROCESSING_POLL_INTERVAL_MS = 500;

interface ThreadSourceStatus {
  id: string;
  status?: SourceResponseDtoStatus;
}

function isSourceWithId(value: unknown): value is { id: string } {
  if (value === null || typeof value !== 'object' || !('id' in value)) {
    return false;
  }
  return typeof (value as { id: unknown }).id === 'string';
}

function extractSourceIds(results: unknown[]): string[] {
  const ids: string[] = [];
  for (const result of results) {
    if (!Array.isArray(result)) continue;
    for (const source of result) {
      if (isSourceWithId(source)) {
        ids.push(source.id);
      }
    }
  }
  return ids;
}

function areSourcesReady(
  threadSources: ThreadSourceStatus[],
  uploadedIds: string[],
): boolean {
  for (const id of uploadedIds) {
    if (!threadSources.some((s) => s.id === id)) return false;
  }
  return !threadSources.some(
    (s) => s.status === SourceResponseDtoStatus.processing,
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  threadSources: ThreadSourceStatus[];
}

export function usePendingMessage({
  sendTextMessage,
  createFileSourceAsync,
  resetCreateFileSourceMutation,
  addKnowledgeBaseAsync,
  chatInputRef,
  threadSources,
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

  // Keep the latest thread sources accessible to the polling loop without
  // re-running the send effect whenever statuses tick.
  const threadSourcesRef = useRef(threadSources);
  useEffect(() => {
    threadSourcesRef.current = threadSources;
  }, [threadSources]);

  useEffect(() => {
    async function uploadPendingSources(): Promise<string[]> {
      if (sources.length === 0) return [];
      const promises = sources.map((source) =>
        createFileSourceAsync({ file: source.file }),
      );
      const results = await Promise.all(promises as Promise<unknown>[]);
      resetCreateFileSourceMutation();
      return extractSourceIds(results);
    }

    async function waitForSourcesProcessed(uploadedIds: string[]) {
      // Wait until: (a) every just-uploaded source is visible in the thread
      // query (covers the brief gap between upload-success and refetch), and
      // (b) no thread source is still PROCESSING.
      let ready = false;
      while (!ready) {
        ready = areSourcesReady(threadSourcesRef.current, uploadedIds);
        if (!ready) await delay(PROCESSING_POLL_INTERVAL_MS);
      }
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
      setIsProcessingPendingSources(true);
      try {
        const uploadedIds = await uploadPendingSources();
        setSources([]);
        await waitForSourcesProcessed(uploadedIds);
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
