import { useSkillsControllerFindAll } from '@/shared/api/generated/ayunisCoreAPI';
import { workspaceSkillListParams } from '@/shared/api/skill-scopes';

interface WorkspaceSkillListOptions {
  search?: string;
  limit?: number;
  offset?: number;
}

export function useWorkspaceSkills(
  workspaceId: string,
  options: WorkspaceSkillListOptions = {},
) {
  const query = useSkillsControllerFindAll(
    workspaceSkillListParams(workspaceId, options),
  );

  return {
    skills: query.data?.data ?? [],
    pagination: query.data?.pagination,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
