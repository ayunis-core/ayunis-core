import { useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useSkillMcpIntegrationsQueries } from '../api/useSkillMcpIntegrationsQueries';
import { useAssignMcpIntegration } from '../api/useAssignMcpIntegration';
import { useUnassignMcpIntegration } from '../api/useUnassignMcpIntegration';
import {
  getMcpIntegrationsCardTranslations,
  McpIntegrationsCard,
  useHandleMcpOAuthCallback,
} from '@/widgets/mcp-integrations-card';

export default function SkillMcpIntegrationsCard({
  disabled = false,
}: Readonly<{
  disabled?: boolean;
}>) {
  const { t } = useTranslation('skill');
  const { id: skillId } = useParams({ from: '/_authenticated/skills/$id' });

  const data = useSkillMcpIntegrationsQueries(skillId);
  const assignMutation = useAssignMcpIntegration(data.availableIntegrations);
  const unassignMutation = useUnassignMcpIntegration();

  useHandleMcpOAuthCallback(t, { refetch: data.refetch });

  const handleToggle = async (integrationId: string) => {
    const isCurrentlyAssigned =
      data.assignedIntegrations?.some((a) => a.id === integrationId) ?? false;
    if (isCurrentlyAssigned) {
      await unassignMutation.mutateAsync({ skillId, integrationId });
    } else {
      await assignMutation.mutateAsync({ skillId, integrationId });
    }
  };

  return (
    <McpIntegrationsCard
      disabled={disabled}
      translations={getMcpIntegrationsCardTranslations(t)}
      hook={{
        ...data,
        handleToggle,
        isPending: assignMutation.isPending || unassignMutation.isPending,
      }}
    />
  );
}
