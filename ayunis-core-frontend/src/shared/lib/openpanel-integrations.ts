import type { QueryClient } from '@tanstack/react-query';
import {
  getMcpIntegrationsControllerListAvailableQueryKey,
  mcpIntegrationsControllerListAvailable,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { McpIntegrationResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { hasOAuthConfiguration } from '@/shared/lib/mcp-oauth';
import { openPanel } from '@/shared/lib/openpanel';
import { trackOpenPanelEvent } from '@/shared/lib/openpanel-events';

type Integration<Fields extends keyof McpIntegrationResponseDto> = Pick<
  McpIntegrationResponseDto,
  'marketplaceIdentifier' | Fields
>;

/** Only marketplace identifiers are catalogue IDs; every other integration sends `null`. */
function trackIntegrationConnected(integration: Integration<never>): void {
  trackOpenPanelEvent('integration_connected', {
    marketplace_slug: integration.marketplaceIdentifier ?? null,
  });
}

/**
 * For a save after which the backend probed the connection with the saved
 * credentials: only a passed probe connected the integration.
 */
export function trackProbedIntegrationConnection(
  integration: Integration<'connectionStatus'>,
): void {
  if (integration.connectionStatus === 'connected') {
    trackIntegrationConnected(integration);
  }
}

/**
 * Saved user credentials connect an integration that requires them, unless it
 * authorizes through OAuth, which connects once OAuth completes.
 */
export function trackUserCredentialsConnection(
  integration: Integration<'userAuthorizationRequired' | 'configSchema'>,
): void {
  const configSchema = integration.configSchema as Parameters<
    typeof hasOAuthConfiguration
  >[0];
  if (
    integration.userAuthorizationRequired === true &&
    !hasOAuthConfiguration(configSchema)
  ) {
    trackIntegrationConnected(integration);
  }
}

/**
 * Completing OAuth only returns the integration's ID, so its marketplace slug
 * is looked up in the user's integrations. The lookup is skipped without a
 * client, and an integration that isn't listed sends nothing rather than
 * passing for a custom one.
 */
export function trackOAuthIntegrationConnected(
  queryClient: QueryClient,
  integrationId: string,
): void {
  if (!openPanel) return;
  queryClient
    .query({
      queryKey: getMcpIntegrationsControllerListAvailableQueryKey(),
      queryFn: ({ signal }) => mcpIntegrationsControllerListAvailable(signal),
    })
    .then((integrations) => {
      const integration = integrations.find(({ id }) => id === integrationId);
      if (integration) trackIntegrationConnected(integration);
    })
    .catch(() => undefined);
}
