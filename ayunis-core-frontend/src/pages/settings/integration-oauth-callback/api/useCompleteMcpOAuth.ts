import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMcpIntegrationsControllerListAvailableQueryKey,
  mcpIntegrationsControllerCompleteOAuth,
  type CompleteMcpOAuthDto,
} from '@/shared/api';
import { trackOAuthIntegrationConnected } from '@/shared/lib/openpanel-integrations';

export function useCompleteMcpOAuth(data: CompleteMcpOAuthDto) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['mcp-oauth', 'complete', data.state],
    queryFn: async () => {
      const completed = await mcpIntegrationsControllerCompleteOAuth(data);
      trackOAuthIntegrationConnected(queryClient, completed.integrationId);
      return completed;
    },
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
