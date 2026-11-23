import { useMcpToolAllowancesControllerList } from '@ayunis/api-client';

export function useMcpToolAllowances() {
  const { data, isLoading, isError, refetch } =
    useMcpToolAllowancesControllerList();

  return {
    allowances: data ?? [],
    isLoading,
    isError,
    refetch,
  };
}
