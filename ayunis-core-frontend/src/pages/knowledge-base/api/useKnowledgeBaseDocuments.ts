import { useKnowledgeBasesControllerListDocuments } from '@/shared/api/generated/ayunisCoreAPI';
import { KnowledgeBaseDocumentResponseDtoStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useProcessingPollInterval } from '@/shared/lib/processing-poll';

export function useKnowledgeBaseDocuments(id: string, enabled = true) {
  const processingPollInterval = useProcessingPollInterval();
  const { data, isLoading } = useKnowledgeBasesControllerListDocuments(id, {
    query: {
      enabled,
      staleTime: 0,
      refetchInterval: (query) => {
        const documents = query.state.data?.data ?? [];
        const hasProcessing = documents.some(
          (doc) =>
            doc.status === KnowledgeBaseDocumentResponseDtoStatus.processing,
        );
        return processingPollInterval(hasProcessing);
      },
    },
  });
  return { documents: data?.data ?? [], isLoading };
}
