import type { McpIntegration } from '../model/types';
import i18n from '@/i18n';

/**
 * Format capability counts for display
 */
export function formatCapabilities(
  prompts: number,
  resources: number,
  tools: number,
): string {
  const parts: string[] = [];
  if (prompts > 0) parts.push(`${prompts} prompt${prompts !== 1 ? 's' : ''}`);
  if (resources > 0)
    parts.push(`${resources} resource${resources !== 1 ? 's' : ''}`);
  if (tools > 0) parts.push(`${tools} tool${tools !== 1 ? 's' : ''}`);
  return parts.length > 0 ? parts.join(', ') : 'No capabilities';
}

/**
 * Get badge variant for integration status
 */
export function getStatusBadgeVariant(
  isEnabled: boolean,
): 'default' | 'secondary' {
  return isEnabled ? 'default' : 'secondary';
}

/**
 * Get display text for integration type
 */
export function getIntegrationTypeLabel(type: McpIntegration['type']): string {
  switch (type) {
    case 'predefined':
      return i18n.t('integrations.helpers.type.predefined', {
        ns: 'admin-settings-integrations',
      });
    case 'marketplace':
      return i18n.t('integrations.helpers.type.marketplace', {
        ns: 'admin-settings-integrations',
      });
    case 'custom':
      return i18n.t('integrations.helpers.type.custom', {
        ns: 'admin-settings-integrations',
      });
  }
}

/**
 * Get display text for auth method
 */
export function getAuthMethodLabel(authMethod?: string): string {
  if (!authMethod)
    return i18n.t('integrations.helpers.authMethod.none', {
      ns: 'admin-settings-integrations',
    });
  switch (authMethod) {
    case 'NO_AUTH':
      return i18n.t('integrations.helpers.authMethod.none', {
        ns: 'admin-settings-integrations',
      });
    case 'CUSTOM_HEADER':
      return i18n.t('integrations.helpers.authMethod.apiKey', {
        ns: 'admin-settings-integrations',
      });
    case 'BEARER_TOKEN':
      return i18n.t('integrations.helpers.authMethod.bearerToken', {
        ns: 'admin-settings-integrations',
      });
    default:
      return authMethod;
  }
}
