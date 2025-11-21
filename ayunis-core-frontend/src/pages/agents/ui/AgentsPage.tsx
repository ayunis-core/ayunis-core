import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import CreateAgentDialog from './CreateAgentDialog';
import AgentCard from './AgentCard';
import type { Agent } from '../model/openapi';
import AgentsEmptyState from './AgentsEmptyState';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import { useTranslation } from 'react-i18next';

interface AgentsPageProps {
  agents: Agent[];
}

export default function AgentsPage({ agents }: AgentsPageProps) {
  const { t } = useTranslation('agents');

  // Sort agents: owned first, then shared; alphabetically within each group
  const sortedAgents = [...agents].sort((a, b) => {
    // Primary sort: owned agents first (isShared: false < true)
    if (a.isShared !== b.isShared) {
      return a.isShared ? 1 : -1;
    }
    // Secondary sort: alphabetically by name
    return a.name.localeCompare(b.name);
  });

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
          agents.length === 0 ? (
            <AgentsEmptyState />
          ) : (
            <div className="space-y-3">
              {sortedAgents.map((agent) => {
                return <AgentCard key={agent.id} agent={agent} />;
              })}
            </div>
          )
        }
      />
    </AppLayout>
  );
}
