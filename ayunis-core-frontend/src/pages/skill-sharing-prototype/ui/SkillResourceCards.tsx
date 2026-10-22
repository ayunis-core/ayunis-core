import { useState } from 'react';
import { showInfo } from '@/shared/lib/toast';
import { KnowledgeBaseCard } from '@/widgets/knowledge-base-card';
import { McpIntegrationsCard } from '@/widgets/mcp-integrations-card';
import { PROTOTYPE_INTEGRATIONS } from '@/widgets/sharing-prototype/model/integration-fixtures';

export function SkillIntegrationsCard({
  disabled,
}: Readonly<{ disabled: boolean }>) {
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  return (
    <McpIntegrationsCard
      disabled={disabled}
      translations={{
        title: 'Integrationen',
        description:
          'Verbinden Sie externe MCP-Server, um die Fähigkeiten zu erweitern',
        failedToLoad:
          'Integrationen konnten nicht geladen werden. Bitte versuchen Sie es erneut.',
        retryButton: 'Erneut versuchen',
        toggleAriaLabel: (name) => `${name} Integration umschalten`,
        configRequiredBadge: 'Konfiguration erforderlich',
      }}
      hook={{
        availableIntegrations: PROTOTYPE_INTEGRATIONS,
        assignedIntegrations: PROTOTYPE_INTEGRATIONS.filter(({ id }) =>
          assignedIds.includes(id),
        ),
        isLoading: false,
        isError: false,
        refetch: () => undefined,
        handleToggle: (integrationId) => {
          setAssignedIds((ids) =>
            ids.includes(integrationId)
              ? ids.filter((id) => id !== integrationId)
              : [...ids, integrationId],
          );
          return Promise.resolve();
        },
        isPending: false,
      }}
    />
  );
}

export function SkillDocumentsCard({
  skillId,
  disabled,
}: Readonly<{ skillId: string; disabled: boolean }>) {
  return (
    <KnowledgeBaseCard
      entity={{ id: skillId }}
      isEnabled
      disabled={disabled}
      translationNamespace="skill"
      sourcesHook={{
        sources: [],
        isLoadingSources: false,
        addFileSource: () =>
          showInfo('Dokumente lassen sich im Prototyp nicht hochladen.'),
        addFileSourcePending: false,
        removeSource: () => undefined,
        removeSourcePending: false,
      }}
    />
  );
}
