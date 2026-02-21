import { useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAgentMcpIntegrationsQueries } from '../api/useAgentMcpIntegrationsQueries';
import { useAssignMcpIntegration } from '../api/useAssignMcpIntegration';
import { useUnassignMcpIntegration } from '../api/useUnassignMcpIntegration';
import { McpIntegrationsCard } from '@/widgets/mcp-integrations-card';

export default function AgentMcpIntegrationsCard({
  disabled = false,
}: Readonly<{
  disabled?: boolean;
}>) {
  const { t } = useTranslation('agent');
  const { id: agentId } = useParams({ from: '/_authenticated/agents/$id' });

  const data = useAgentMcpIntegrationsQueries(agentId);
  const assignMutation = useAssignMcpIntegration(data.availableIntegrations);
  const unassignMutation = useUnassignMcpIntegration();

  const handleToggle = async (integrationId: string) => {
    const isCurrentlyAssigned =
      data.assignedIntegrations?.some((a) => a.id === integrationId) ?? false;
    if (isCurrentlyAssigned) {
      await unassignMutation.mutateAsync({ agentId, integrationId });
    } else {
      await assignMutation.mutateAsync({ agentId, integrationId });
    }
  };

  return (
    <McpIntegrationsCard
      disabled={disabled}
      translations={{
        title: t('mcpIntegrations.title'),
        description: t('mcpIntegrations.description'),
        failedToLoad: t('mcpIntegrations.errors.failedToLoad'),
        retryButton: t('mcpIntegrations.retryButton'),
        toggleAriaLabel: (name: string) =>
          t('mcpIntegrations.toggleAriaLabel', { name }),
      }}
      hook={{
        ...data,
        handleToggle,
        isPending: assignMutation.isPending || unassignMutation.isPending,
      }}
    />
  );
}
