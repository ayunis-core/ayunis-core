import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/widgets/empty-state';

interface WorkspacesEmptyStateProps {
  action?: ReactNode;
  canCreate: boolean;
}

export function WorkspacesEmptyState({
  action,
  canCreate,
}: Readonly<WorkspacesEmptyStateProps>) {
  const { t } = useTranslation('workspaces');

  return (
    <EmptyState
      title={t('page.emptyTitle')}
      description={
        canCreate
          ? t('page.emptyDescription')
          : t('page.emptyDescriptionNoCreate')
      }
      action={action}
      testId={canCreate ? 'workspaces-empty' : 'workspaces-empty-no-create'}
    />
  );
}
