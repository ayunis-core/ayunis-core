import { useTeamsControllerListTeams } from '@ayunis/api-client';

export function useInviteTeams(enabled: boolean) {
  const query = useTeamsControllerListTeams({ query: { enabled } });
  return {
    teams: query.data ?? [],
    isLoading: query.isPending,
    isError: query.isError,
  };
}
