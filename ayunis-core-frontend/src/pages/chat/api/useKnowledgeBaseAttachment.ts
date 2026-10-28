import {
  useThreadKnowledgeBasesControllerAddKnowledgeBase,
  useThreadKnowledgeBasesControllerRemoveKnowledgeBase,
  getThreadsControllerFindOneQueryKey,
  getThreadAiContextControllerGetAiContextQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useQueryClient } from '@tanstack/react-query';
import { showError } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';
import { useTranslation } from 'react-i18next';

interface UseKnowledgeBaseAttachmentProps {
  threadId: string;
}

export function useKnowledgeBaseAttachment({
  threadId,
}: UseKnowledgeBaseAttachmentProps) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('chat');

  const invalidateThreadContext = () => {
    void queryClient.invalidateQueries({
      queryKey: getThreadsControllerFindOneQueryKey(threadId),
    });
    void queryClient.invalidateQueries({
      queryKey: getThreadAiContextControllerGetAiContextQueryKey(threadId),
    });
  };

  const showAttachmentError = (error: unknown, fallbackKey: string) => {
    try {
      const { code } = extractErrorData(error);
      const key =
        code === 'KNOWLEDGE_BASE_NOT_FOUND' || code === 'THREAD_NOT_FOUND'
          ? 'chat.errorKnowledgeBaseUnavailable'
          : fallbackKey;
      showError(t(key));
    } catch {
      showError(t(fallbackKey));
    }
  };

  const addMutation = useThreadKnowledgeBasesControllerAddKnowledgeBase({
    mutation: {
      onSuccess: invalidateThreadContext,
      onError: (error) => {
        showAttachmentError(error, 'chat.errorAddKnowledgeBase');
      },
    },
  });

  const removeMutation = useThreadKnowledgeBasesControllerRemoveKnowledgeBase({
    mutation: {
      onSuccess: invalidateThreadContext,
      onError: (error) => {
        showAttachmentError(error, 'chat.errorRemoveKnowledgeBase');
      },
    },
  });

  const addKnowledgeBase = (knowledgeBaseId: string) => {
    addMutation.mutate({ id: threadId, knowledgeBaseId });
  };

  const addKnowledgeBaseAsync = (knowledgeBaseId: string) => {
    return addMutation.mutateAsync({ id: threadId, knowledgeBaseId });
  };

  const removeKnowledgeBase = (knowledgeBaseId: string) => {
    removeMutation.mutate({ id: threadId, knowledgeBaseId });
  };

  return {
    addKnowledgeBase,
    addKnowledgeBaseAsync,
    removeKnowledgeBase,
  };
}
