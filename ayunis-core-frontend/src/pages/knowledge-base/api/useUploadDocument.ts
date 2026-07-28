import {
  useIsMutating,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showSuccess, showInfo, showError } from '@/shared/lib/toast';
import {
  knowledgeBaseDocumentsControllerFinalizeDocumentUpload,
  getKnowledgeBaseDocumentsControllerListDocumentsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { KnowledgeBaseDocumentResponseDtoStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import handleSourceUploadError from '@/shared/lib/handle-source-upload-error';
import { uploadFileResumable } from '@/shared/lib/upload-file-resumable';

export function useUploadDocument(knowledgeBaseId: string) {
  const { t } = useTranslation('knowledge-bases');
  const queryClient = useQueryClient();
  const mutationKey = ['knowledgeBasesAddDocument', knowledgeBaseId];

  const mutation = useMutation({
    mutationKey,
    retry: 0,
    // Resumable chunked upload (tus), then finalize to validate and process.
    mutationFn: async ({ id, data }: { id: string; data: { file: File } }) => {
      const uploadId = await uploadFileResumable(data.file);
      return knowledgeBaseDocumentsControllerFinalizeDocumentUpload(
        id,
        uploadId,
      );
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey:
          getKnowledgeBaseDocumentsControllerListDocumentsQueryKey(
            knowledgeBaseId,
          ),
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
  });

  const uploadDocument = (file: File) => {
    mutation.mutate({
      id: knowledgeBaseId,
      data: { file },
    });
  };

  const activeUploads = useIsMutating({ mutationKey });

  return { uploadDocument, isUploading: activeUploads > 0 };
}
