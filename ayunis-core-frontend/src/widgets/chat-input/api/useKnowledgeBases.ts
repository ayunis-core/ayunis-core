import { useKnowledgeBasesControllerFindAll } from '@ayunis/api-client/endpoints';
import type { KnowledgeBaseResponseDto } from '@ayunis/api-client/schemas';
import { personalKnowledgeBaseListParams } from '@/shared/api/knowledge-base-scopes';

interface UseKnowledgeBasesOptions {
  enabled?: boolean;
}

export function useKnowledgeBases(options: UseKnowledgeBasesOptions = {}) {
  const { enabled = true } = options;
  const { data, isLoading, error } = useKnowledgeBasesControllerFindAll<
    KnowledgeBaseResponseDto[]
  >(personalKnowledgeBaseListParams, {
    query: {
      enabled,
      select: (response) => response.data,
    },
  });

  return {
    knowledgeBases: data ?? [],
    isLoading,
    error,
  };
}
