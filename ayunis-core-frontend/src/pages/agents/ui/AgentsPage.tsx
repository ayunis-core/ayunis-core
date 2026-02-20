import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import CreateAgentDialog from './CreateAgentDialog';
import AgentCard from './AgentCard';
import type { Agent } from '../model/openapi';
import AgentsEmptyState from './AgentsEmptyState';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import { useTranslation } from 'react-i18next';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/shared/ui/shadcn/tabs';
import { EmptyState } from '@/widgets/empty-state';

interface AgentsPageProps {
  agents: Agent[];
}

export default function AgentsPage({ agents }: Readonly<AgentsPageProps>) {
  const { t } = useTranslation('agents');

  // Separate agents into personal (owned) and shared
  const personalAgents = agents
    .filter((agent) => !agent.isShared)
    .sort((a, b) => a.name.localeCompare(b.name));

  const sharedAgents = agents
    .filter((agent) => agent.isShared)
    .sort((a, b) => a.name.localeCompare(b.name));

  // If no agents at all, show full-screen empty state
  if (agents.length === 0) {
    return (
      <AppLayout>
        <FullScreenMessageLayout
          header={
            <ContentAreaHeader
              title={t('page.title')}
              action={<CreateAgentDialog />}
            />
          }
        >
          <AgentsEmptyState />
        </FullScreenMessageLayout>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            title={t('page.title')}
            action={<CreateAgentDialog />}
          />
        }
        contentArea={
          <Tabs defaultValue="personal" className="w-full">
            <TabsList>
              <TabsTrigger value="personal">{t('tabs.personal')}</TabsTrigger>
              <TabsTrigger value="shared">{t('tabs.shared')}</TabsTrigger>
            </TabsList>
            <TabsContent value="personal" className="mt-4">
              {personalAgents.length === 0 ? (
                <EmptyState
                  title={t('emptyState.personal.title')}
                  description={t('emptyState.personal.description')}
                  action={
                    <CreateAgentDialog
                      buttonText={t('createDialog.buttonTextFirst')}
                      showIcon={true}
                    />
                  }
                />
              ) : (
                <div className="space-y-3">
                  {personalAgents.map((agent) => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="shared" className="mt-4">
              {sharedAgents.length === 0 ? (
                <EmptyState
                  title={t('emptyState.shared.title')}
                  description={t('emptyState.shared.description')}
                />
              ) : (
                <div className="space-y-3">
                  {sharedAgents.map((agent) => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        }
      />
    </AppLayout>
  );
}
