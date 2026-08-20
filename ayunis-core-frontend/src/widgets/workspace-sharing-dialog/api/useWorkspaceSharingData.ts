import {
  useUserControllerGetUsersInOrganization,
  useWorkspaceSharingControllerGetSharing,
} from '@/shared/api/generated/ayunisCoreAPI';

export function useWorkspaceSharingData(workspaceId: string, enabled: boolean) {
  const sharing = useWorkspaceSharingControllerGetSharing(workspaceId, {
    query: { enabled },
  });
  const users = useUserControllerGetUsersInOrganization(
    { limit: 100, offset: 0 },
    { query: { enabled } },
  );
  return {
    sharing: sharing.data,
    users: users.data?.data ?? [],
    teams: sharing.data?.availableTeams ?? [],
    isLoading: sharing.isLoading || users.isLoading,
    error: sharing.error ?? users.error,
  };
}
