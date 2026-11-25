import { useOparlBodiesControllerList } from '@ayunis/api-client';

export function useOparlCatalogBodies() {
  const { data, isLoading, isError, refetch } = useOparlBodiesControllerList();
  return { bodies: data ?? [], isLoading, isError, refetch };
}
