import { useQuery } from '@tanstack/react-query';
import {
  userControllerGetUsersInOrganization,
  useWorkspaceSharingControllerGetSharing,
} from '@/shared/api/generated/ayunisCoreAPI';

const USERS_PAGE_SIZE = 100;

async function fetchAllOrganizationUsers(signal: AbortSignal) {
  const firstPage = await userControllerGetUsersInOrganization(
    { limit: USERS_PAGE_SIZE, offset: 0 },
    signal,
  );
  const total = firstPage.pagination.total ?? firstPage.data.length;
  const offsets = Array.from(
    { length: Math.ceil(total / USERS_PAGE_SIZE) - 1 },
    (_, index) => (index + 1) * USERS_PAGE_SIZE,
  );
  const remainingPages = await Promise.all(
    offsets.map((offset) =>
      userControllerGetUsersInOrganization(
        { limit: USERS_PAGE_SIZE, offset },
        signal,
      ),
    ),
  );
  return [firstPage, ...remainingPages].flatMap(({ data }) => data);
}

function useAllOrganizationUsers(enabled: boolean) {
  return useQuery({
    queryKey: ['/users', 'all'],
    queryFn: ({ signal }) => fetchAllOrganizationUsers(signal),
    enabled,
  });
}

export function useWorkspaceSharingData(workspaceId: string, enabled: boolean) {
  const sharing = useWorkspaceSharingControllerGetSharing(workspaceId, {
    query: { enabled },
  });
  const users = useAllOrganizationUsers(enabled);
  return {
    sharing: sharing.data,
    users: users.data ?? [],
    teams: sharing.data?.availableTeams ?? [],
    isLoading: sharing.isLoading || users.isLoading,
    error: sharing.error ?? users.error,
  };
}
