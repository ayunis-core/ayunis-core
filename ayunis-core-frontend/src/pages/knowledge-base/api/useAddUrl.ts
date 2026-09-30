import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useKnowledgeBasesControllerAddUrl,
  getKnowledgeBasesControllerListDocumentsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { isDocumentFormFieldError } from '@/widgets/knowledge-base-documents-card/lib/document-form-errors';
import type { AddUrlInput } from '@/widgets/knowledge-base-documents-card/model/types';

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
        // The dialog shows these on its fields.
        if (isDocumentFormFieldError(error)) return;
        try {
          const errorData = extractErrorData(error);
          if (errorData.code === 'UNSUPPORTED_CONTENT_TYPE') {
            showError(t('detail.documents.addUrlUnsupportedContentType'));
          } else if (errorData.code === 'RETRIEVAL_FAILED') {
            showError(t('detail.documents.addUrlRetrievalFailed'));
          } else {
            showError(t('detail.documents.addUrlError'));
          }
        } catch {
          showError(t('detail.documents.addUrlError'));
        }
      },
    },
  });

  const addUrlAsync = async ({
    url,
    maxDepth,
    reindexInterval,
  }: AddUrlInput) => {
    await mutation.mutateAsync({
      id: knowledgeBaseId,
      data: { url, maxDepth, reindexInterval: reindexInterval ?? undefined },
    });
  };

  return { addUrlAsync, isAddingUrl: mutation.isPending };
}
