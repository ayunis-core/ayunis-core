import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/widgets/empty-state';

export function TeamsEmptyState() {
  const { t } = useTranslation('admin-settings-teams');

  return (
    <EmptyState
      title={t('teams.list.emptyTitle')}
      description={t('teams.list.emptyDescription')}
    />
  );
}
