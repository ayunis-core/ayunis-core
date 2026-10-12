import { useTeamManagementControllerGetTeamManagementAccess } from '@/shared/api';

export function useTeamManagementAccess() {
  const query = useTeamManagementControllerGetTeamManagementAccess({
    query: {
      staleTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: 'always',
      refetchInterval: 5000,
    },
  });
  return {
    canManageTeams: query.isFetchedAfterMount && query.data?.canManage === true,
    isLoading: query.isPending,
  };
}
