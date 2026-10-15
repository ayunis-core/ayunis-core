import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/widgets/empty-state';

export function CreateFirstTeamEmptyState() {
  const { t } = useTranslation('admin-settings-teams');

  return (
    <EmptyState
      title={t('teams.list.emptyTitle')}
      description={t('teams.list.emptyDescription')}
    />
  );
}

export function NoTeamsFoundEmptyState() {
  const { t } = useTranslation('admin-settings-teams');

  return (
    <EmptyState
      title={t('teams.list.noMatchesTitle')}
      description={t('teams.list.noMatchesDescription')}
    />
  );
}

export function NoManageableTeamsEmptyState() {
  const { t } = useTranslation('admin-settings-teams');

  return (
    <EmptyState
      title={t('teams.list.forbiddenTitle')}
      description={t('teams.list.forbiddenDescription')}
      testId="teams-forbidden"
    />
  );
}
