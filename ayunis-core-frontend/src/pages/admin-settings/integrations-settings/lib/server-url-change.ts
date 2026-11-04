import type { McpIntegration } from '@/pages/admin-settings/integrations-settings/model/types';
import { hasOAuthConfiguration } from '@/shared/lib/mcp-oauth';

export interface ServerUrlChange {
  changed: boolean;
  signsOutUsers: boolean;
  requiresNewOAuthClient: boolean;
}

/**
 * OAuth clients and user tokens are bound to the server they were issued by,
 * so the backend signs every user out when the URL changes and only accepts
 * the change for a static client together with a replacement client.
 */
export function describeServerUrlChange(
  integration: McpIntegration,
  serverUrl: string,
): ServerUrlChange {
  const changed = serverUrl.trim() !== (integration.serverUrl ?? '');
  const schema = integration.configSchema as
    Parameters<typeof hasOAuthConfiguration>[0] | undefined;
  const oauth = hasOAuthConfiguration(schema) ? schema.oauth : undefined;
  return {
    changed,
    signsOutUsers: changed && oauth !== undefined,
    requiresNewOAuthClient: changed && oauth?.clientRegistration === 'static',
  };
}
