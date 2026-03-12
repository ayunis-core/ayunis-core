import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useKnowledgeBasesControllerAddUrl,
  getKnowledgeBasesControllerListDocumentsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';

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
      onError: (error: unknown) => {
        try {
          const errorData = extractErrorData(error);
          if (errorData.code === 'UNSUPPORTED_CONTENT_TYPE') {
            showError(t('detail.documents.addUrlUnsupportedContentType'));
          } else {
            showError(t('detail.documents.addUrlError'));
          }
        } catch {
          showError(t('detail.documents.addUrlError'));
        }
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
