import {
  useIsMutating,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getWorkspaceContextControllerListKnowledgeBaseDocumentsQueryKey,
  useWorkspaceContextControllerListKnowledgeBaseDocuments,
  workspaceContextControllerAddKnowledgeBaseDocument,
  workspaceContextControllerRemoveKnowledgeBaseDocument,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { WorkspaceDocumentResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { KnowledgeBaseDocumentsController } from '@/widgets/knowledge-base-documents-card';
import handleSourceUploadError from '@/shared/lib/handle-source-upload-error';
import { showError } from '@/shared/lib/toast';
import { useInvalidateWorkspaceResources } from './useInvalidateWorkspaceResources';

export function useWorkspaceKnowledgeBaseDocuments(
  workspaceId: string,
  knowledgeBaseId: string,
  initialData: WorkspaceDocumentResponseDto[],
): KnowledgeBaseDocumentsController {
  const { t } = useTranslation('knowledge-bases');
  const queryClient = useQueryClient();
  const invalidateResources = useInvalidateWorkspaceResources(workspaceId);
  const queryKey =
    getWorkspaceContextControllerListKnowledgeBaseDocumentsQueryKey(
      workspaceId,
      knowledgeBaseId,
    );
  const uploadKey = [...queryKey, 'upload'];
  const { data: documents, isLoading } =
    useWorkspaceContextControllerListKnowledgeBaseDocuments(
      workspaceId,
      knowledgeBaseId,
      {
        query: {
          initialData,
          staleTime: 0,
          refetchInterval: (query) =>
            query.state.data?.some(
              (document) => document.status === 'processing',
            )
              ? 5000
              : false,
        },
      },
    );
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey });
    await invalidateResources();
  };
  const upload = useMutation({
    mutationKey: uploadKey,
    mutationFn: (file: File) =>
      workspaceContextControllerAddKnowledgeBaseDocument(
        workspaceId,
        knowledgeBaseId,
        { file },
      ),
    retry: 0,
    onSuccess: refresh,
    onError: (error: unknown) => handleSourceUploadError(error, t),
  });
  const remove = useMutation({
    mutationFn: (documentId: string) =>
      workspaceContextControllerRemoveKnowledgeBaseDocument(
        workspaceId,
        knowledgeBaseId,
        documentId,
      ),
    onSuccess: refresh,
    onError: () => showError(t('detail.documents.removeError')),
  });
  const pendingUploads = useIsMutating({ mutationKey: uploadKey });
  return {
    documents: documents.map((document) => ({
      ...document,
      processingError: document.processingError ?? undefined,
    })),
    isLoading,
    isUploading: pendingUploads > 0,
    isRemoving: remove.isPending,
    uploadDocument: upload.mutate,
    removeDocument: remove.mutate,
  };
}
