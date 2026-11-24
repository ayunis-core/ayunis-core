import { useSuperAdminSsoConnectionsControllerGet } from '@ayunis/api-client';

export function useSuperAdminSsoConnection(orgId: string) {
  const query = useSuperAdminSsoConnectionsControllerGet(orgId);

  return {
    connection: query.data?.connection ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
