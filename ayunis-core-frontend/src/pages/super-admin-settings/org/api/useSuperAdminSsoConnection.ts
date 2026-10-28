import { useSuperAdminSsoConnectionsControllerGet } from '@/shared/api';

export function useSuperAdminSsoConnection(orgId: string) {
  const query = useSuperAdminSsoConnectionsControllerGet(orgId);

  return {
    connection: query.data?.connection ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
