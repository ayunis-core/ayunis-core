import { useTeamsControllerListMyTeams } from '@/shared/api';

export function useMyTeamAdminTeamIds() {
  const { data, isLoading } = useTeamsControllerListMyTeams({
    query: { staleTime: 0, refetchOnWindowFocus: true },
  });
  const teamAdminTeamIds = (data ?? [])
    .filter((team) => team.isTeamAdmin)
    .map((team) => team.id);

  return { teamAdminTeamIds, isLoading };
}
