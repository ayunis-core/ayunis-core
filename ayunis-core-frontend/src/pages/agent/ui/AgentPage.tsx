import AppLayout from '@/layouts/app-layout';
import type { AgentResponseDto } from '@/shared/api';
import type { ShareResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import AgentKnowledgeBaseCard from './AgentKnowledgeBaseCard';
import AgentPropertiesCard from './AgentPropertiesCard';
import AgentMcpIntegrationsCard from './AgentMcpIntegrationsCard';
import SharesTab from './SharesTab';
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

export function AgentPage({
  agent,
  shares,
  isEmbeddingModelEnabled,
  initialTab = 'config',
}: {
  agent: AgentResponseDto;
  shares: ShareResponseDto[];
  isEmbeddingModelEnabled: boolean;
  initialTab?: 'config' | 'share';
}) {
  const navigate = useNavigate();
  const { t } = useTranslation('agent');
  const { id } = useParams({
    from: '/_authenticated/agents/$id',
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
              <AgentKnowledgeBaseCard
                agent={agent}
                isEnabled={isEmbeddingModelEnabled}
                disabled
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
                  <AgentKnowledgeBaseCard
                    agent={agent}
                    isEnabled={isEmbeddingModelEnabled}
                  />
                  <AgentMcpIntegrationsCard />
                </div>
              </TabsContent>
              <TabsContent value="share" className="mt-4">
                <SharesTab agentId={agent.id} shares={shares} />
              </TabsContent>
            </Tabs>
          )
        }
      />
    </AppLayout>
  );
}
