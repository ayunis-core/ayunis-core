import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useKnowledgeBasesControllerAddUrl,
  getKnowledgeBasesControllerListDocumentsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export function useAddUrl(knowledgeBaseId: string) {
  const { t } = useTranslation('knowledge-bases');
  const queryClient = useQueryClient();

  const mutation = useKnowledgeBasesControllerAddUrl({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey:
            getKnowledgeBasesControllerListDocumentsQueryKey(knowledgeBaseId),
        });
        showSuccess(t('detail.documents.addUrlSuccess'));
      },
      onError: () => {
        showError(t('detail.documents.addUrlError'));
      },
    },
  });

  const addUrlAsync = async (url: string) => {
    await mutation.mutateAsync({
      id: knowledgeBaseId,
      data: { url },
    });
  };

  return { addUrlAsync, isAddingUrl: mutation.isPending };
}
