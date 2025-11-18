import AppLayout from '@/layouts/app-layout';
import type { AgentResponseDto } from '@/shared/api';
import type { ShareResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import AgentKnowledgeBaseCard from './AgentKnowledgeBaseCard';
import AgentToolsCard from './AgentToolsCard';
import AgentPropertiesCard from './AgentPropertiesCard';
import AgentMcpIntegrationsCard from './AgentMcpIntegrationsCard';
import SharesTab from './SharesTab';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/shared/ui/shadcn/tabs';
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

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={<ContentAreaHeader title={agent.name} />}
        contentArea={
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
                <AgentToolsCard />
              </div>
            </TabsContent>
            <TabsContent value="share" className="mt-4">
              <SharesTab agentId={agent.id} shares={shares} />
            </TabsContent>
          </Tabs>
        }
      />
    </AppLayout>
  );
}
