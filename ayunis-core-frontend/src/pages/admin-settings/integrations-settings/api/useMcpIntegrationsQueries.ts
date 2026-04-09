import {
  useMcpIntegrationsControllerList,
  useMcpIntegrationsControllerListPredefinedConfigs,
  getMcpIntegrationsControllerListQueryKey,
  getMcpIntegrationsControllerListPredefinedConfigsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { McpIntegrationResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { parseOAuthInfo } from '@/shared/lib/mcp-oauth';
import type { McpIntegration, McpIntegrationOAuthInfo } from '../model/types';

export function useMcpIntegrationsQueries() {
  const {
    data: integrationsData = [],
    isLoading: isLoadingIntegrations,
    error: integrationsError,
    refetch: refetchIntegrations,
  } = useMcpIntegrationsControllerList({
    query: {
      refetchOnWindowFocus: true,
      staleTime: 30000,
      queryKey: getMcpIntegrationsControllerListQueryKey(),
    },
  });

  const { data: predefinedConfigs = [] } =
    useMcpIntegrationsControllerListPredefinedConfigs({
      query: {
        staleTime: 300000, // 5 minutes
        queryKey: getMcpIntegrationsControllerListPredefinedConfigsQueryKey(),
      },
    });

  const integrations = integrationsData.map(toMcpIntegration);

  return {
    integrations,
    isLoadingIntegrations,
    integrationsError,
    refetchIntegrations,
    predefinedConfigs,
  };
}

function toMcpIntegration(
  integration: McpIntegrationResponseDto,
): McpIntegration {
  return {
    ...integration,
    oauth: toOAuthInfo(integration.oauth),
  };
}

function toOAuthInfo(value: unknown): McpIntegrationOAuthInfo | undefined {
  const base = parseOAuthInfo(value);
  if (!base) {
    return undefined;
  }

  const oauth = value as Record<string, unknown>;
  if (typeof oauth.hasClientCredentials !== 'boolean') {
    return undefined;
  }

  return {
    ...base,
    hasClientCredentials: oauth.hasClientCredentials,
  };
}
