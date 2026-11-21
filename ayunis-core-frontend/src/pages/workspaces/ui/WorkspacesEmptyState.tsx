import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, FolderPlus, Layers, MessagesSquare } from 'lucide-react';
import { EmptyState } from '@/widgets/empty-state';
import { ChatStarter, type ChatStarterDefaults } from '@/widgets/chat-starter';

interface WorkspacesEmptyStateProps {
  action?: ReactNode;
  chatStarter: ChatStarterDefaults;
}

export function WorkspacesEmptyState({
  action,
  chatStarter,
}: Readonly<WorkspacesEmptyStateProps>) {
  const { t } = useTranslation('workspaces');

  return (
    <EmptyState
      testId="workspaces-empty-state"
      icon={FolderOpen}
      title={t('page.emptyTitle')}
      description={t('page.emptyDescription')}
      steps={[
        {
          icon: FolderPlus,
          title: t('emptyState.steps.create.title'),
          description: t('emptyState.steps.create.description'),
        },
        {
          icon: Layers,
          title: t('emptyState.steps.context.title'),
          description: t('emptyState.steps.context.description'),
        },
        {
          icon: MessagesSquare,
          title: t('emptyState.steps.chat.title'),
          description: t('emptyState.steps.chat.description'),
        },
      ]}
      helpPath="workspaces/"
      action={action}
      guide={
        <ChatStarter
          {...chatStarter}
          origin={{ kind: 'feature_guide', feature: 'workspaces' }}
          placeholder={t('emptyState.askPlaceholder')}
        />
      }
    />
  );
}
