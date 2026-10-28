import { useKnowledgeBasesControllerFindAll } from '@/shared/api/generated/ayunisCoreAPI';
import type { KnowledgeBaseResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
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
