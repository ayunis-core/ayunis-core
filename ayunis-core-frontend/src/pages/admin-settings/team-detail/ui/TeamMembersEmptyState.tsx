import { EmptyState } from '@/widgets/empty-state';
import { useTranslation } from 'react-i18next';

export function TeamMembersEmptyState() {
  const { t } = useTranslation('admin-settings-teams');

  return (
    <EmptyState
      title={t('teamDetail.members.emptyTitle')}
      description={t('teamDetail.members.emptyDescription')}
    />
  );
}
