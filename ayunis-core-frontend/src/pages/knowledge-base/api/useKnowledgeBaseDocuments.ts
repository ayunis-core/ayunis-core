import { useKnowledgeBasesControllerListDocuments } from '@/shared/api/generated/ayunisCoreAPI';
import { KnowledgeBaseDocumentResponseDtoStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';

const PROCESSING_POLL_INTERVAL = 5000;

export function useKnowledgeBaseDocuments(id: string) {
  const { data, isLoading } = useKnowledgeBasesControllerListDocuments(id, {
    query: {
      staleTime: 0,
      // eslint-disable-next-line sonarjs/function-return-type -- React Query's refetchInterval expects number | false
      refetchInterval: (query) => {
        const documents = query.state.data?.data ?? [];
        const hasProcessing = documents.some(
          (doc) =>
            doc.status === KnowledgeBaseDocumentResponseDtoStatus.processing,
        );
        return hasProcessing ? PROCESSING_POLL_INTERVAL : false;
      },
    },
  });
  return { documents: data?.data ?? [], isLoading };
}
