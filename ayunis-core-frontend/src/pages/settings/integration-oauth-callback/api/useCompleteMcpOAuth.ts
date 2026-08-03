import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMcpIntegrationsControllerListAvailableQueryKey,
  mcpIntegrationsControllerCompleteOAuth,
  type CompleteMcpOAuthDto,
} from '@/shared/api';

export function useCompleteMcpOAuth(data: CompleteMcpOAuthDto) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['mcp-oauth', 'complete', data.state],
    queryFn: () => mcpIntegrationsControllerCompleteOAuth(data),
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    if (query.isSuccess) {
      void queryClient.invalidateQueries({
        queryKey: getMcpIntegrationsControllerListAvailableQueryKey(),
      });
    }
  }, [query.isSuccess, queryClient]);

  return {
    isPending: query.isPending,
    isSuccess: query.isSuccess,
    isError: query.isError,
  };
}
