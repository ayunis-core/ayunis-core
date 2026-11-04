import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showSuccess, showInfo, showError } from '@/shared/lib/toast';
import {
  getKnowledgeBasesControllerListDocumentsQueryKey,
  knowledgeBaseUploadsControllerCompleteUpload,
  knowledgeBaseUploadsControllerCreateUpload,
} from '@/shared/api/generated/ayunisCoreAPI';
import { KnowledgeBaseDocumentResponseDtoStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import handleSourceUploadError from '@/shared/lib/handle-source-upload-error';
import { useDirectSourceUpload } from '@/shared/lib/source-upload';

export function useUploadDocument(knowledgeBaseId: string) {
  const { t } = useTranslation('knowledge-bases');
  const queryClient = useQueryClient();

  const { upload, uploads, isUploading } = useDirectSourceUpload(
    {
      createSession: (file, signal) =>
        knowledgeBaseUploadsControllerCreateUpload(
          knowledgeBaseId,
          { fileName: file.name, mimeType: file.type, fileSize: file.size },
          signal,
        ),
      complete: (uploadId, signal) =>
        knowledgeBaseUploadsControllerCompleteUpload(
          knowledgeBaseId,
          uploadId,
          signal,
        ),
    },
    {
      onSuccess: async (data) => {
        await queryClient.invalidateQueries({
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
      onError: (error) => handleSourceUploadError(error, t),
    },
  );

  return { uploadDocument: upload, isUploading, uploads };
}
