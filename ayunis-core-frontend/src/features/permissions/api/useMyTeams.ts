import { useTeamsControllerListMyTeams } from '@/shared/api';

/**
 * The current user's teams with their team role and the permissions they hold
 * in each team. Team roles change in another (admin) session, so this query
 * stays always-stale like `useMyPermissions`.
 */
export function useMyTeams() {
  const { data, isLoading } = useTeamsControllerListMyTeams({
    query: { staleTime: 0, refetchOnWindowFocus: true },
  });

  return { teams: data ?? [], isLoading };
}
