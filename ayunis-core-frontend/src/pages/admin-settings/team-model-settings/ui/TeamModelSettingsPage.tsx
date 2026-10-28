import { useTranslation } from 'react-i18next';
import { defaultStringifySearch } from '@tanstack/react-router';
import SettingsLayout from '@/pages/admin-settings/admin-settings-layout';
import type { TeamResponseDto } from '@/shared/api';
import { TeamModelsTab } from './TeamModelsTab';

interface TeamModelSettingsPageProps {
  readonly team: TeamResponseDto;
  readonly search: string;
}

export default function TeamModelSettingsPage({
  team,
  search,
}: TeamModelSettingsPageProps) {
  const { t } = useTranslation('admin-settings-models');
  const { t: tLayout } = useTranslation('admin-settings-layout');
  const title = t('teamPolicy.title', { team: team.name });
  const listSearch = defaultStringifySearch({ tab: 'teams', search });
  const organizationSearch = defaultStringifySearch({
    tab: 'organization',
    search,
  });
  return (
    <SettingsLayout
      title={title}
      breadcrumbs={[
        {
          label: tLayout('layout.models'),
          href: `/admin-settings/models${organizationSearch}`,
        },
        {
          label: t('tabs.teams'),
          href: `/admin-settings/models${listSearch}`,
        },
        { label: team.name },
      ]}
    >
      <div className="space-y-4" data-testid="team-model-settings-page">
        <TeamModelsTab
          teamId={team.id}
          teamName={team.name}
          modelOverrideEnabled={team.modelOverrideEnabled}
        />
      </div>
    </SettingsLayout>
  );
}
