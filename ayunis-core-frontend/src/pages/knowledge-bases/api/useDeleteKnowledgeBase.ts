import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  knowledgeBasesControllerDelete,
  getKnowledgeBasesControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useRouter } from '@tanstack/react-router';
import extractErrorData from '@/shared/api/extract-error-data';

interface DeleteKnowledgeBaseParams {
  id: string;
}

export function useDeleteKnowledgeBase() {
  const { t } = useTranslation('knowledge-bases');
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ id }: DeleteKnowledgeBaseParams) => {
      await knowledgeBasesControllerDelete(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getKnowledgeBasesControllerFindAllQueryKey(),
      });
      void router.invalidate();
      showSuccess(t('delete.success'));
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        if (code === 'KNOWLEDGE_BASE_NOT_FOUND') {
          showError(t('delete.notFound'));
        } else {
          showError(t('delete.error'));
        }
      } catch {
        showError(t('delete.error'));
      }
    },
  });
}
