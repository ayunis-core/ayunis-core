import AppLayout from '@/layouts/app-layout';
import type { AgentResponseDto } from '@/shared/api';
import type {
  ShareResponseDto,
  TeamResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import { KnowledgeBaseCard } from '@/widgets/knowledge-base-card';
import AgentPropertiesCard from './AgentPropertiesCard';
import AgentMcpIntegrationsCard from './AgentMcpIntegrationsCard';
import { SharesTab } from '@/widgets/shares-tab';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/shared/ui/shadcn/tabs';
import { Badge } from '@/shared/ui/shadcn/badge';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import useAgentSources from '../api/useAgentSources';

export function AgentPage({
  agent,
  shares,
  userTeams,
  isEmbeddingModelEnabled,
  initialTab = 'config',
}: Readonly<{
  agent: AgentResponseDto;
  shares: ShareResponseDto[];
  userTeams: TeamResponseDto[];
  isEmbeddingModelEnabled: boolean;
  initialTab?: 'config' | 'share';
}>) {
  const navigate = useNavigate();
  const { t } = useTranslation('agent');
  const { id } = useParams({
    from: '/_authenticated/agents/$id',
  });

  const sourcesHook = useAgentSources({
    entity: agent,
    translationNamespace: 'agent',
  });

  const handleTabChange = useCallback(
    (value: string) => {
      void navigate({
        to: '/agents/$id',
        params: { id },
        search: value === 'config' ? {} : { tab: value as 'share' },
      });
    },
    [navigate, id],
  );

  const isReadOnly = agent.isShared;

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            title={agent.name}
            badge={
              isReadOnly ? (
                <Badge variant="secondary">{t('shared.badge')}</Badge>
              ) : undefined
            }
          />
        }
        contentArea={
          isReadOnly ? (
            <div className="grid gap-4">
              <AgentPropertiesCard agent={agent} disabled />
              <KnowledgeBaseCard
                entity={agent}
                isEnabled={isEmbeddingModelEnabled}
                disabled
                translationNamespace="agent"
                sourcesHook={sourcesHook}
              />
              <AgentMcpIntegrationsCard disabled />
            </div>
          ) : (
            <Tabs
              value={initialTab}
              onValueChange={handleTabChange}
              className="w-full"
            >
              <TabsList>
                <TabsTrigger value="config">
                  {t('tabs.configuration')}
                </TabsTrigger>
                <TabsTrigger value="share">{t('tabs.shares')}</TabsTrigger>
              </TabsList>
              <TabsContent value="config" className="mt-4">
                <div className="grid gap-4">
                  <AgentPropertiesCard agent={agent} />
                  <KnowledgeBaseCard
                    entity={agent}
                    isEnabled={isEmbeddingModelEnabled}
                    translationNamespace="agent"
                    sourcesHook={sourcesHook}
                  />
                  <AgentMcpIntegrationsCard />
                </div>
              </TabsContent>
              <TabsContent value="share" className="mt-4">
                <SharesTab
                  entityType="agent"
                  entityId={agent.id}
                  shares={shares}
                  userTeams={userTeams}
                />
              </TabsContent>
            </Tabs>
          )
        }
      />
    </AppLayout>
  );
}
