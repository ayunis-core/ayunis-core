import { IntegrationsMenuAction } from '@ayunis/chat/surface';
import type { IntegrationSummary } from '@/shared/contexts/chat/chatContext';
import { useAvailableIntegrations } from '@/widgets/chat-input/api/useAvailableIntegrations';
import { queryStatus } from '@/widgets/chat-input/lib/query-status';

export function IntegrationsSubmenu({
  onIntegrationSelect,
  attachedIntegrationIds,
}: Readonly<{
  onIntegrationSelect: (integration: IntegrationSummary) => void;
  attachedIntegrationIds: string[];
}>) {
  const query = useAvailableIntegrations();
  return (
    <IntegrationsMenuAction
      items={query.integrations}
      status={queryStatus(query)}
      attachedIds={attachedIntegrationIds}
      onSelect={onIntegrationSelect}
    />
  );
}
