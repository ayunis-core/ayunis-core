import { useTeamsControllerListTeams } from '@/shared/api';

export function useModelTeams() {
  const {
    data: teams = [],
    isLoading,
    isError,
  } = useTeamsControllerListTeams();
  return { teams, isLoading, isError };
}
