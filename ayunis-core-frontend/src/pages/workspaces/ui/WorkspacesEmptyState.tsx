import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/widgets/empty-state';

interface WorkspacesEmptyStateProps {
  action?: ReactNode;
}

export function WorkspacesEmptyState({
  action,
}: Readonly<WorkspacesEmptyStateProps>) {
  const { t } = useTranslation('workspaces');

  return (
    <EmptyState
      title={t('page.emptyTitle')}
      description={t('page.emptyDescription')}
      action={action}
    />
  );
}
