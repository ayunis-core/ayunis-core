import { useWorkspaceTeamGrantMembersControllerList } from '@/shared/api/generated/ayunisCoreAPI';

export function useWorkspaceTeamMembers(
  workspaceId: string,
  teamId: string,
  enabled: boolean,
) {
  const query = useWorkspaceTeamGrantMembersControllerList(
    workspaceId,
    teamId,
    {
      query: { enabled },
    },
  );

  return {
    members: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
