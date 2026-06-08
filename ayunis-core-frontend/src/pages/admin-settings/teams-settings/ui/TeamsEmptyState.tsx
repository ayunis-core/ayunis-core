import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/widgets/empty-state';

interface TeamsEmptyStateProps {
  hasFilters?: boolean;
}

export function TeamsEmptyState({
  hasFilters = false,
}: Readonly<TeamsEmptyStateProps>) {
  const { t } = useTranslation('admin-settings-teams');

  if (hasFilters) {
    return (
      <EmptyState
        title={t('teams.list.noMatchesTitle')}
        description={t('teams.list.noMatchesDescription')}
      />
    );
  }

  return (
    <EmptyState
      title={t('teams.list.emptyTitle')}
      description={t('teams.list.emptyDescription')}
    />
  );
}
