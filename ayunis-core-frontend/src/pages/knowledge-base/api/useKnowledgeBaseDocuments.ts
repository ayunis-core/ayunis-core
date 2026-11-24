import { useKnowledgeBasesControllerListDocuments } from '@ayunis/api-client/endpoints';
import {
  isSourcePending,
  useProcessingPollInterval,
} from '@/shared/lib/processing-poll';

export function useKnowledgeBaseDocuments(id: string, enabled = true) {
  const processingPollInterval = useProcessingPollInterval(id);
  const { data, isLoading } = useKnowledgeBasesControllerListDocuments(id, {
    query: {
      enabled,
      staleTime: 0,
      refetchInterval: (query) => {
        const documents = query.state.data?.data ?? [];
        return processingPollInterval(documents.some(isSourcePending));
      },
    },
  });
  return { documents: data?.data ?? [], isLoading };
}
