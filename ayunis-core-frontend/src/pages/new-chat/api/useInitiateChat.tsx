import {
  getThreadsControllerFindAllQueryKey,
  getThreadsControllerFindOneQueryKey,
  threadKnowledgeBasesControllerAddKnowledgeBase,
  threadSourcesControllerAddFileSource,
  threadsControllerFindOne,
  useThreadsControllerCreate,
} from '@/shared/api/generated/ayunisCoreAPI';
import { SourceResponseDtoStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import handleSourceUploadError from '@/shared/lib/handle-source-upload-error';
import { showError } from '@/shared/lib/toast';
import { useChatContext } from '@/shared/contexts/chat/useChatContext';
import type { KnowledgeBaseSummary } from '@/shared/contexts/chat/chatContext';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CreateThreadData } from '../model/openapi';
import type { SourceResponseDtoType } from '@/shared/api';

const PROCESSING_POLL_INTERVAL_MS = 500;
const PROCESSING_TIMEOUT_MS = 180_000;
const UPLOAD_TIMEOUT_MS = 60_000;

interface PendingSource {
  id: string;
  name: string;
  type: SourceResponseDtoType;
  file: File;
}

export type SourceUploadStatus =
  | { kind: 'uploading' }
  | { kind: 'processing' }
  | { kind: 'failed'; message: string };

interface InitiateChatParams {
  message: string;
  modelId?: string;
  agentId?: string;
  sources: PendingSource[];
  knowledgeBases: KnowledgeBaseSummary[];
  isAnonymous: boolean;
  /** Reports per-source progress so the page can render upload/processing
   *  state on each chip. */
  onSourceStatus?: (sourceId: string, status: SourceUploadStatus) => void;
}

class CancelledError extends Error {
  constructor() {
    super('Cancelled');
    this.name = 'CancelledError';
  }
}

async function waitForSourcesProcessed(
  threadId: string,
  isCancelled: () => boolean,
): Promise<void> {
  const deadline = Date.now() + PROCESSING_TIMEOUT_MS;
  for (;;) {
    if (isCancelled()) throw new CancelledError();
    const thread = await threadsControllerFindOne(threadId);
    const stillProcessing = thread.sources.some(
      (s) => s.status === SourceResponseDtoStatus.processing,
    );
    if (!stillProcessing) return;
    if (Date.now() >= deadline) {
      throw new Error('Source processing timed out');
    }
    await new Promise((resolve) =>
      setTimeout(resolve, PROCESSING_POLL_INTERVAL_MS),
    );
  }
}

export const useInitiateChat = (options?: { onSuccess?: () => void }) => {
  const { t } = useTranslation('chat');
  const { t: tCommon } = useTranslation('common');
  const { setPendingMessage } = useChatContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createThreadMutation = useThreadsControllerCreate();
  const [isAttachingResources, setIsAttachingResources] = useState(false);

  // Cancellation flag is a ref because we want `cancel()` to flip it
  // synchronously and have any in-flight pipeline observe it on the next
  // checkpoint, without dragging it through the dependency graph.
  const cancelledRef = useRef(false);

  async function uploadOneSource(
    threadId: string,
    source: PendingSource,
    onSourceStatus?: (id: string, status: SourceUploadStatus) => void,
  ): Promise<void> {
    try {
      await threadSourcesControllerAddFileSource(
        threadId,
        { file: source.file },
        AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
      );
      onSourceStatus?.(source.id, { kind: 'processing' });
    } catch (error) {
      onSourceStatus?.(source.id, {
        kind: 'failed',
        message: error instanceof Error ? error.message : 'Upload failed',
      });
      throw error;
    }
  }

  /** Returns true on success, false on user-visible failure (toast already
   *  shown). Caller should bail on false. */
  async function uploadAllSources(
    threadId: string,
    sources: PendingSource[],
    onSourceStatus?: (id: string, status: SourceUploadStatus) => void,
  ): Promise<boolean> {
    sources.forEach((s) => onSourceStatus?.(s.id, { kind: 'uploading' }));
    try {
      await Promise.all(
        sources.map((source) =>
          uploadOneSource(threadId, source, onSourceStatus),
        ),
      );
      return true;
    } catch (error) {
      console.error('Failed to upload sources:', error);
      handleSourceUploadError(error, tCommon);
      return false;
    }
  }

  /** Returns true on success, false on user-visible failure (toast shown). */
  async function attachKnowledgeBases(
    threadId: string,
    knowledgeBases: KnowledgeBaseSummary[],
    isCancelled: () => boolean,
  ): Promise<boolean> {
    for (const kb of knowledgeBases) {
      if (isCancelled()) return false;
      try {
        await threadKnowledgeBasesControllerAddKnowledgeBase(threadId, kb.id);
      } catch (error) {
        console.error('Failed to attach knowledge base:', error);
        showError(t('chat.errorAddKnowledgeBase'));
        return false;
      }
    }
    return true;
  }

  async function initiateChat({
    message,
    modelId,
    agentId,
    sources,
    knowledgeBases,
    isAnonymous,
    onSourceStatus,
  }: InitiateChatParams): Promise<void> {
    cancelledRef.current = false;
    const isCancelled = () => cancelledRef.current;

    let thread;
    try {
      const createThreadData: CreateThreadData = {
        modelId,
        agentId,
        isAnonymous,
      };
      thread = await createThreadMutation.mutateAsync({
        data: createThreadData,
      });
    } catch (error) {
      console.error('Failed to create thread:', error);
      showError(t('chat.errorSendMessage'));
      return;
    }
    if (isCancelled()) return;

    if (sources.length === 0 && knowledgeBases.length === 0) {
      finalizeAndNavigate(thread.id, message);
      return;
    }

    setIsAttachingResources(true);
    try {
      if (sources.length > 0) {
        const ok = await uploadAllSources(thread.id, sources, onSourceStatus);
        if (!ok || isCancelled()) return;

        try {
          await waitForSourcesProcessed(thread.id, isCancelled);
        } catch (error) {
          if (error instanceof CancelledError) return;
          console.error('Source processing failed or timed out:', error);
          showError(tCommon('sources.fileSourceTimeoutError'));
          return;
        }
      }

      const kbOk = await attachKnowledgeBases(
        thread.id,
        knowledgeBases,
        isCancelled,
      );
      if (!kbOk || isCancelled()) return;

      finalizeAndNavigate(thread.id, message);
    } finally {
      setIsAttachingResources(false);
    }
  }

  function finalizeAndNavigate(threadId: string, message: string) {
    void queryClient.invalidateQueries({
      queryKey: getThreadsControllerFindAllQueryKey(),
    });
    void queryClient.invalidateQueries({
      queryKey: getThreadsControllerFindOneQueryKey(threadId),
    });
    setPendingMessage(message);
    options?.onSuccess?.();
    void navigate({ to: '/chats/$threadId', params: { threadId } });
  }

  function cancel() {
    cancelledRef.current = true;
    setIsAttachingResources(false);
  }

  return {
    initiateChat,
    cancel,
    isCreating: createThreadMutation.isPending || isAttachingResources,
    error: createThreadMutation.error,
  };
};
