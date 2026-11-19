import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';
import {
  useKnowledgeBasesControllerRemoveFailedDocuments,
  getKnowledgeBasesControllerListDocumentsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export function useRemoveFailedDocuments(knowledgeBaseId: string) {
  const { t } = useTranslation('knowledge-bases');
  const queryClient = useQueryClient();

  const mutation = useKnowledgeBasesControllerRemoveFailedDocuments({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey:
            getKnowledgeBasesControllerListDocumentsQueryKey(knowledgeBaseId),
        });
        showSuccess(t('detail.documents.removeFailedSuccess'));
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          showError(
            t(
              code === 'KNOWLEDGE_BASE_NOT_FOUND'
                ? 'delete.notFound'
                : 'detail.documents.removeFailedError',
            ),
          );
        } catch {
          showError(t('detail.documents.removeFailedError'));
        }
      },
    },
  });

  const removeFailedDocuments = () => {
    mutation.mutate({ id: knowledgeBaseId });
  };

  return { removeFailedDocuments, isRemovingFailed: mutation.isPending };
}
