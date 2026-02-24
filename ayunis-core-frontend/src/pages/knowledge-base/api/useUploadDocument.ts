import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  useKnowledgeBasesControllerAddDocument,
  getKnowledgeBasesControllerListDocumentsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export function useUploadDocument(knowledgeBaseId: string) {
  const { t } = useTranslation('knowledge-bases');
  const queryClient = useQueryClient();

  const mutation = useKnowledgeBasesControllerAddDocument({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey:
            getKnowledgeBasesControllerListDocumentsQueryKey(knowledgeBaseId),
        });
        showSuccess(t('detail.documents.uploadSuccess'));
      },
      onError: () => {
        showError(t('detail.documents.uploadError'));
      },
    },
  });

  const uploadDocument = (file: Blob) => {
    mutation.mutate({
      id: knowledgeBaseId,
      data: { file },
    });
  };

  return { uploadDocument, isUploading: mutation.isPending };
}
