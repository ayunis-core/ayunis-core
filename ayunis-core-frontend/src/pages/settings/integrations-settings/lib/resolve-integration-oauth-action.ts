import { hasOAuthConfiguration } from '@/shared/lib/mcp-oauth';
import { hasUserEditableFields } from './is-user-integration-visible';

interface IntegrationAuthorizationState {
  configSchema?: unknown;
  userAuthorized?: boolean;
}

export type IntegrationOAuthAction =
  'configure' | 'configureThenConnect' | 'connect' | 'reconnect';

export function resolveIntegrationOAuthAction(
  integration: IntegrationAuthorizationState,
): IntegrationOAuthAction {
  if (!usesOAuth(integration)) return 'configure';
  if (integration.userAuthorized === true) return 'reconnect';
  return hasUserEditableFields(integration)
    ? 'configureThenConnect'
    : 'connect';
}

export function canDisconnectOAuth(
  integration: IntegrationAuthorizationState,
): boolean {
  return usesOAuth(integration) && integration.userAuthorized === true;
}

function usesOAuth(integration: IntegrationAuthorizationState): boolean {
  return hasOAuthConfiguration(
    integration.configSchema as Parameters<typeof hasOAuthConfiguration>[0],
  );
}
