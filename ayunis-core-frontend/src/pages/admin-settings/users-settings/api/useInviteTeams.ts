import { useTeamsControllerListTeams } from '@/shared/api';

export function useInviteTeams(enabled: boolean) {
  const query = useTeamsControllerListTeams({ query: { enabled } });
  return {
    teams: query.data ?? [],
    isLoading: query.isPending,
    isError: query.isError,
  };
}
