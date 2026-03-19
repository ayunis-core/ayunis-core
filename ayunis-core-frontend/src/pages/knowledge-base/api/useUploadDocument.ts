import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showSuccess, showInfo, showError } from '@/shared/lib/toast';
import {
  useKnowledgeBasesControllerAddDocument,
  getKnowledgeBasesControllerListDocumentsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { KnowledgeBaseDocumentResponseDtoStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import handleSourceUploadError from '@/shared/lib/handle-source-upload-error';

export function useUploadDocument(knowledgeBaseId: string) {
  const { t } = useTranslation('knowledge-bases');
  const queryClient = useQueryClient();

  const mutation = useKnowledgeBasesControllerAddDocument({
    mutation: {
      onSuccess: (data) => {
        void queryClient.invalidateQueries({
          queryKey:
            getKnowledgeBasesControllerListDocumentsQueryKey(knowledgeBaseId),
        });
        if (data.status === KnowledgeBaseDocumentResponseDtoStatus.processing) {
          showInfo(t('detail.documents.uploadAccepted'));
        } else if (
          data.status === KnowledgeBaseDocumentResponseDtoStatus.failed
        ) {
          showError(data.processingError ?? t('detail.documents.statusFailed'));
        } else {
          showSuccess(t('detail.documents.uploadSuccess'));
        }
      },
      onError: (error: unknown) => {
        handleSourceUploadError(error, t);
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
