import {
  useMcpIntegrationsControllerList,
  useMcpIntegrationsControllerListPredefinedConfigs,
  getMcpIntegrationsControllerListQueryKey,
  getMcpIntegrationsControllerListPredefinedConfigsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { McpIntegrationResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
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
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const oauth = value as Record<string, unknown>;
  const enabled = oauth.enabled;
  const level = oauth.level;
  const authorized = oauth.authorized;
  const hasClientCredentials = oauth.hasClientCredentials;

  if (typeof enabled !== 'boolean') {
    return undefined;
  }
  const normalizedLevel = level === undefined ? null : level;
  if (
    normalizedLevel !== null &&
    normalizedLevel !== 'org' &&
    normalizedLevel !== 'user'
  ) {
    return undefined;
  }
  if (typeof authorized !== 'boolean') {
    return undefined;
  }
  if (typeof hasClientCredentials !== 'boolean') {
    return undefined;
  }

  return {
    enabled,
    level: normalizedLevel,
    authorized,
    hasClientCredentials,
  };
}
