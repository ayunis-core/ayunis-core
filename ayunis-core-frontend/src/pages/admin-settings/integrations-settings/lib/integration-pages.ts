import type { McpIntegration } from '@/pages/admin-settings/integrations-settings/model/types';

export const INTEGRATIONS_PAGE_SIZE = 10;

export function sortIntegrationsByName(
  integrations: readonly McpIntegration[],
): McpIntegration[] {
  return [...integrations].sort((a, b) => a.name.localeCompare(b.name));
}

export function upsertIntegration(
  integrations: readonly McpIntegration[],
  saved: McpIntegration,
): McpIntegration[] {
  return [
    ...integrations.filter((integration) => integration.id !== saved.id),
    saved,
  ];
}

export function pageOfIntegration(
  sortedIntegrations: readonly McpIntegration[],
  integrationId: string,
): number | undefined {
  const index = sortedIntegrations.findIndex(
    (integration) => integration.id === integrationId,
  );
  return index === -1
    ? undefined
    : Math.floor(index / INTEGRATIONS_PAGE_SIZE) + 1;
}
