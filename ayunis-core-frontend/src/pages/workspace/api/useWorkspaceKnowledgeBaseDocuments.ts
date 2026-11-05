import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getKnowledgeBasesControllerFindOneQueryKey,
  getKnowledgeBasesControllerListDocumentsQueryKey,
  useKnowledgeBasesControllerListDocuments,
  knowledgeBaseUploadsControllerCompleteUpload,
  knowledgeBaseUploadsControllerCreateUpload,
  knowledgeBasesControllerAddUrl,
  knowledgeBasesControllerRemoveDocument,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { KnowledgeBaseDocumentListResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import extractErrorData from '@/shared/api/extract-error-data';
import type { KnowledgeBaseDocumentsController } from '@/widgets/knowledge-base-documents-card';
import handleSourceUploadError from '@/shared/lib/handle-source-upload-error';
import { useDirectSourceUpload } from '@/shared/lib/source-upload';
import { useProcessingPollInterval } from '@/shared/lib/processing-poll';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useInvalidateWorkspaceResources } from './useInvalidateWorkspaceResources';

function useDocuments(
  knowledgeBaseId: string,
  initialData: KnowledgeBaseDocumentListResponseDto,
) {
  const processingPollInterval = useProcessingPollInterval();
  return useKnowledgeBasesControllerListDocuments(knowledgeBaseId, {
    query: {
      initialData,
      staleTime: 0,
      refetchInterval: (query) =>
        processingPollInterval(
          query.state.data?.data.some(
            (document) => document.status === 'processing',
          ) ?? false,
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

function addUrlErrorKey(error: unknown) {
  const { code } = extractErrorData(error);
  if (code === 'UNSUPPORTED_CONTENT_TYPE')
    return 'detail.documents.addUrlUnsupportedContentType';
  if (code === 'RETRIEVAL_FAILED')
    return 'detail.documents.addUrlRetrievalFailed';
  return 'detail.documents.addUrlError';
}

function useAddUrl(knowledgeBaseId: string, refresh: () => Promise<void>) {
  const { t } = useTranslation('knowledge-bases');
  const mutation = useMutation({
    mutationFn: ({ url, maxDepth }: { url: string; maxDepth: number }) =>
      knowledgeBasesControllerAddUrl(knowledgeBaseId, { url, maxDepth }),
    onSuccess: async () => {
      await refresh();
      showSuccess(t('detail.documents.addUrlSuccess'));
    },
    onError: (error) => {
      try {
        showError(t(addUrlErrorKey(error)));
      } catch {
        showError(t('detail.documents.addUrlError'));
      }
    },
  });
  return {
    addUrlAsync: (url: string, maxDepth: number) =>
      mutation.mutateAsync({ url, maxDepth }),
    isAddingUrl: mutation.isPending,
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
  const addUrl = useAddUrl(knowledgeBaseId, refresh);
  return {
    documents: response.data.map((document) => ({
      ...document,
      processingError: document.processingError ?? undefined,
    })),
    isLoading,
    ...upload,
    ...remove,
    ...addUrl,
  };
}
