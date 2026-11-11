import { useMcpToolAllowancesControllerList } from '@/shared/api';

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
