import { useMcpIntegrationsControllerListAvailable } from '@/shared/api/generated/ayunisCoreAPI';
import type { McpIntegrationResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

/**
 * Lists the enabled org integrations that expose per-user config fields — i.e.
 * the ones an individual user can authorize for themselves. Org-level and
 * no-auth integrations are filtered out.
 */
export function useUserIntegrations() {
  const { data, isLoading, isError, refetch } =
    useMcpIntegrationsControllerListAvailable();

  const integrations: McpIntegrationResponseDto[] = (data ?? []).filter(
    (integration) =>
      integration.type === 'marketplace' && integration.hasUserFields === true,
  );

  return {
    integrations,
    isLoading,
    isError,
    refetch,
  };
}
