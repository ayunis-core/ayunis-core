import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showSuccess, showInfo, showError } from '@/shared/lib/toast';
import {
  getKnowledgeBasesControllerListDocumentsQueryKey,
  knowledgeBaseUploadsControllerCompleteUpload,
  knowledgeBaseUploadsControllerCreateUpload,
} from '@ayunis/api-client/endpoints';
import { KnowledgeBaseDocumentResponseDtoStatus } from '@ayunis/api-client/schemas';
import handleSourceUploadError from '@/shared/lib/handle-source-upload-error';
import { useDirectSourceUpload } from '@/shared/lib/source-upload';
import { getSourceProcessingErrorReason } from '@ayunis/chat/source-errors';

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
        // The upload is done whatever the list refresh does; say so first.
        if (data.status === KnowledgeBaseDocumentResponseDtoStatus.processing) {
          showInfo(t('detail.documents.uploadAccepted'));
        } else if (
          data.status === KnowledgeBaseDocumentResponseDtoStatus.failed
        ) {
          showError(
            t(
              `detail.documents.processingErrors.${getSourceProcessingErrorReason(data.processingErrorCode)}`,
            ),
          );
        } else {
          showSuccess(t('detail.documents.uploadSuccess'));
        }
        await queryClient.invalidateQueries({
          queryKey:
            getKnowledgeBasesControllerListDocumentsQueryKey(knowledgeBaseId),
        });
      },
      onError: (error) => handleSourceUploadError(error, t),
    },
    { scope: knowledgeBaseId },
  );

  return { uploadDocument: upload, isUploading, uploads };
}
