import { useSuperAdminOparlSystemsControllerList } from '@ayunis/api-client';

export function useOparlSystems() {
  const { data, isLoading, isError, refetch } =
    useSuperAdminOparlSystemsControllerList();
  return { systems: data ?? [], isLoading, isError, refetch };
}
