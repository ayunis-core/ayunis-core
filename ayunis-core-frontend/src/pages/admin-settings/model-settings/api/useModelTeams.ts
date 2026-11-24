import { useTeamsControllerListTeams } from '@ayunis/api-client';

export function useModelTeams() {
  const {
    data: teams = [],
    isLoading,
    isError,
  } = useTeamsControllerListTeams();
  return { teams, isLoading, isError };
}
