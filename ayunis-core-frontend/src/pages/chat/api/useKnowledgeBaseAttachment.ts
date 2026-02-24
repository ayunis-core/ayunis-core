import {
  useThreadsControllerAddKnowledgeBase,
  useThreadsControllerRemoveKnowledgeBase,
  getThreadsControllerFindOneQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useQueryClient } from '@tanstack/react-query';
import { showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';

interface UseKnowledgeBaseAttachmentProps {
  threadId: string;
}

export function useKnowledgeBaseAttachment({
  threadId,
}: UseKnowledgeBaseAttachmentProps) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('chat');

  const addMutation = useThreadsControllerAddKnowledgeBase({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getThreadsControllerFindOneQueryKey(threadId),
        });
      },
      onError: () => {
        showError(t('chat.errorAddKnowledgeBase'));
      },
    },
  });

  const removeMutation = useThreadsControllerRemoveKnowledgeBase({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getThreadsControllerFindOneQueryKey(threadId),
        });
      },
      onError: () => {
        showError(t('chat.errorRemoveKnowledgeBase'));
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
