import { useKnowledgeBasesControllerFindAll } from '@/shared/api/generated/ayunisCoreAPI';
import { workspaceKnowledgeBaseListParams } from '@/shared/api/knowledge-base-scopes';

interface WorkspaceKnowledgeBaseListOptions {
  limit?: number;
  offset?: number;
}

export function useWorkspaceKnowledgeBases(
  workspaceId: string,
  options: WorkspaceKnowledgeBaseListOptions = {},
) {
  const query = useKnowledgeBasesControllerFindAll(
    workspaceKnowledgeBaseListParams(workspaceId, options),
  );

  return {
    knowledgeBases: query.data?.data ?? [],
    pagination: query.data?.pagination,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
