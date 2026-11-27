import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getKnowledgeBasesControllerFindOneQueryKey,
  getKnowledgeBasesControllerListDocumentsQueryKey,
  useKnowledgeBasesControllerListDocuments,
  knowledgeBaseUploadsControllerCompleteUpload,
  knowledgeBaseUploadsControllerCreateUpload,
  knowledgeBasesControllerRemoveDocument,
  knowledgeBasesControllerRemoveFailedDocuments,
} from '@ayunis/api-client/endpoints';
import type { KnowledgeBaseDocumentListResponseDto } from '@ayunis/api-client/schemas';
import extractErrorData from '@/shared/api/extract-error-data';
import type { KnowledgeBaseDocumentsController } from '@/widgets/knowledge-base-documents-card';
import handleSourceUploadError from '@/shared/lib/handle-source-upload-error';
import { useDirectSourceUpload } from '@/shared/lib/source-upload';
import {
  isSourcePending,
  useProcessingPollInterval,
} from '@/shared/lib/processing-poll';
import { showError } from '@/shared/lib/toast';
import { useInvalidateWorkspaceResources } from './useInvalidateWorkspaceResources';

function useDocuments(
  knowledgeBaseId: string,
  initialData: KnowledgeBaseDocumentListResponseDto,
) {
  const processingPollInterval = useProcessingPollInterval(knowledgeBaseId);
  return useKnowledgeBasesControllerListDocuments(knowledgeBaseId, {
    query: {
      initialData,
      staleTime: 0,
      refetchInterval: (query) =>
        processingPollInterval(
          query.state.data?.data.some(isSourcePending) ?? false,
        ),
    },
  });
}

function useRefreshDocuments(workspaceId: string, knowledgeBaseId: string) {
  const queryClient = useQueryClient();
  const invalidateResources = useInvalidateWorkspaceResources(workspaceId);
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey:
          getKnowledgeBasesControllerListDocumentsQueryKey(knowledgeBaseId),
      }),
      queryClient.invalidateQueries({
        queryKey: getKnowledgeBasesControllerFindOneQueryKey(knowledgeBaseId),
      }),
    ]);
    await invalidateResources();
  };
}

function useUploadDocument(
  knowledgeBaseId: string,
  refresh: () => Promise<void>,
) {
  const { t } = useTranslation('knowledge-bases');
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
      onSuccess: refresh,
      onError: (error) => handleSourceUploadError(error, t),
    },
    { scope: knowledgeBaseId },
  );
  return { uploadDocument: upload, isUploading, uploads };
}

function useRemoveDocument(
  knowledgeBaseId: string,
  refresh: () => Promise<void>,
) {
  const { t } = useTranslation('knowledge-bases');
  const mutation = useMutation({
    mutationFn: (documentId: string) =>
      knowledgeBasesControllerRemoveDocument(knowledgeBaseId, documentId),
    onSuccess: refresh,
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        showError(
          t(
            code === 'DOCUMENT_NOT_IN_KNOWLEDGE_BASE'
              ? 'detail.documents.removeNotFound'
              : 'detail.documents.removeError',
          ),
        );
      } catch {
        showError(t('detail.documents.removeError'));
      }
    },
  });
  return { removeDocument: mutation.mutate, isRemoving: mutation.isPending };
}

function useRemoveFailedDocuments(
  knowledgeBaseId: string,
  refresh: () => Promise<void>,
) {
  const { t } = useTranslation('knowledge-bases');
  const mutation = useMutation({
    mutationFn: () =>
      knowledgeBasesControllerRemoveFailedDocuments(knowledgeBaseId),
    onSuccess: refresh,
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
  });
  return {
    removeFailedDocuments: () => mutation.mutate(),
    isRemovingFailed: mutation.isPending,
  };
}

export function useWorkspaceKnowledgeBaseDocuments(
  workspaceId: string,
  knowledgeBaseId: string,
  initialData: KnowledgeBaseDocumentListResponseDto,
): KnowledgeBaseDocumentsController {
  const { data: response, isLoading } = useDocuments(
    knowledgeBaseId,
    initialData,
  );
  const refresh = useRefreshDocuments(workspaceId, knowledgeBaseId);
  const upload = useUploadDocument(knowledgeBaseId, refresh);
  const remove = useRemoveDocument(knowledgeBaseId, refresh);
  const removeFailed = useRemoveFailedDocuments(knowledgeBaseId, refresh);
  return {
    documents: response.data.map((document) => ({
      ...document,
      processingError: document.processingError ?? undefined,
    })),
    isLoading,
    ...upload,
    ...remove,
    ...removeFailed,
  };
}
