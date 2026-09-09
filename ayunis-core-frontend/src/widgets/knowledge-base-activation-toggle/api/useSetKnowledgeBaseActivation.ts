import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  getKnowledgeBasesControllerFindAllQueryKey,
  getKnowledgeBasesControllerFindOneQueryKey,
  knowledgeBasesControllerSetActivation,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useSetKnowledgeBaseActivation() {
  const { t } = useTranslation('knowledge-bases');
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      await knowledgeBasesControllerSetActivation(id, { isActive }),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({
        queryKey: getKnowledgeBasesControllerFindAllQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: getKnowledgeBasesControllerFindOneQueryKey(id),
      });
      void router.invalidate();
      showSuccess(t('activation.success'));
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        showError(
          t(
            code === 'KNOWLEDGE_BASE_NOT_FOUND'
              ? 'activation.notFound'
              : 'activation.error',
          ),
        );
      } catch {
        showError(t('activation.error'));
      }
    },
  });
}
