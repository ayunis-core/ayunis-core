import { useTranslation } from 'react-i18next';
import SettingsLayout from '@/pages/admin-settings/admin-settings-layout';
import { EmptyState } from '@/widgets/empty-state';

export function TeamForbiddenPage() {
  const { t } = useTranslation('admin-settings-teams');

  return (
    <SettingsLayout
      breadcrumbs={[
        { label: t('teamDetail.backToTeams'), href: '/admin-settings/teams' },
      ]}
    >
      <EmptyState
        title={t('teamDetail.forbidden.title')}
        description={t('teamDetail.forbidden.description')}
        testId="team-forbidden"
      />
    </SettingsLayout>
  );
}
