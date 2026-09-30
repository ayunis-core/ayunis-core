import {
  useIsMutating,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getKnowledgeBasesControllerFindOneQueryKey,
  getKnowledgeBasesControllerListDocumentsQueryKey,
  useKnowledgeBasesControllerListDocuments,
  knowledgeBasesControllerAddDocument,
  knowledgeBasesControllerAddUrl,
  knowledgeBasesControllerRemoveDocument,
  knowledgeBasesControllerSetDocumentReindexSchedule,
} from '@/shared/api/generated/ayunisCoreAPI';
import type {
  KnowledgeBaseDocumentListResponseDto,
  ReindexIntervalDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import extractErrorData from '@/shared/api/extract-error-data';
import type { KnowledgeBaseDocumentsController } from '@/widgets/knowledge-base-documents-card';
import {
  isDocumentFormFieldError,
  reindexScheduleErrorKey,
} from '@/widgets/knowledge-base-documents-card/lib/document-form-errors';
import type { AddUrlInput } from '@/widgets/knowledge-base-documents-card/model/types';
import handleSourceUploadError from '@/shared/lib/handle-source-upload-error';
import { showError, showSuccess } from '@/shared/lib/toast';
import { useInvalidateWorkspaceResources } from './useInvalidateWorkspaceResources';

function useDocuments(
  knowledgeBaseId: string,
  initialData: KnowledgeBaseDocumentListResponseDto,
) {
  return useKnowledgeBasesControllerListDocuments(knowledgeBaseId, {
    query: {
      initialData,
      staleTime: 0,
      refetchInterval: (query) =>
        query.state.data?.data.some(
          (document) => document.status === 'processing',
        )
          ? 5000
          : false,
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
  const mutationKey = [
    ...getKnowledgeBasesControllerListDocumentsQueryKey(knowledgeBaseId),
    'upload',
  ];
  const mutation = useMutation({
    mutationKey,
    mutationFn: (file: File) =>
      knowledgeBasesControllerAddDocument(knowledgeBaseId, { file }),
    retry: 0,
    onSuccess: refresh,
    onError: (error: unknown) => handleSourceUploadError(error, t),
  });
  return {
    uploadDocument: mutation.mutate,
    isUploading: useIsMutating({ mutationKey }) > 0,
  };
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
    mutationFn: ({ url, maxDepth, reindexInterval }: AddUrlInput) =>
      knowledgeBasesControllerAddUrl(knowledgeBaseId, {
        url,
        maxDepth,
        reindexInterval: reindexInterval ?? undefined,
      }),
    onSuccess: async () => {
      await refresh();
      showSuccess(t('detail.documents.addUrlSuccess'));
    },
    onError: (error) => {
      // The dialog shows these on its fields.
      if (isDocumentFormFieldError(error)) return;
      try {
        showError(t(addUrlErrorKey(error)));
      } catch {
        showError(t('detail.documents.addUrlError'));
      }
    },
  });
  return {
    addUrlAsync: mutation.mutateAsync,
    isAddingUrl: mutation.isPending,
  };
}

function useSetReindexSchedule(
  knowledgeBaseId: string,
  refresh: () => Promise<void>,
) {
  const { t } = useTranslation('knowledge-bases');
  const mutation = useMutation({
    mutationFn: ({
      documentId,
      reindexInterval,
    }: {
      documentId: string;
      reindexInterval: ReindexIntervalDto | null;
    }) =>
      knowledgeBasesControllerSetDocumentReindexSchedule(
        knowledgeBaseId,
        documentId,
        { reindexInterval },
      ),
    onSuccess: async (document) => {
      await refresh();
      showSuccess(
        t(
          document.reindexInterval
            ? 'detail.documents.reindex.saved'
            : 'detail.documents.reindex.removed',
        ),
      );
    },
    onError: (error) => {
      // The dialog shows these on its fields.
      if (isDocumentFormFieldError(error)) return;
      showError(t(reindexScheduleErrorKey(error)));
    },
  });
  return {
    setReindexScheduleAsync: (
      documentId: string,
      reindexInterval: ReindexIntervalDto | null,
    ) => mutation.mutateAsync({ documentId, reindexInterval }),
    isSettingReindexSchedule: mutation.isPending,
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
  const reindexSchedule = useSetReindexSchedule(knowledgeBaseId, refresh);
  return {
    documents: response.data.map((document) => ({
      ...document,
      processingError: document.processingError ?? undefined,
    })),
    isLoading,
    ...upload,
    ...remove,
    ...addUrl,
    ...reindexSchedule,
  };
}
