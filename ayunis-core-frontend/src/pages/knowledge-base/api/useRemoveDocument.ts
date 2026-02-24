import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useKnowledgeBasesControllerRemoveDocument,
  getKnowledgeBasesControllerListDocumentsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export function useRemoveDocument(knowledgeBaseId: string) {
  const { t } = useTranslation('knowledge-bases');
  const queryClient = useQueryClient();

  const mutation = useKnowledgeBasesControllerRemoveDocument({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey:
            getKnowledgeBasesControllerListDocumentsQueryKey(knowledgeBaseId),
        });
        showSuccess(t('detail.documents.removeSuccess'));
      },
      onError: () => {
        showError(t('detail.documents.removeError'));
      },
    },
  });

  const removeDocument = (documentId: string) => {
    mutation.mutate({ id: knowledgeBaseId, documentId });
  };

  return { removeDocument, isRemoving: mutation.isPending };
}
