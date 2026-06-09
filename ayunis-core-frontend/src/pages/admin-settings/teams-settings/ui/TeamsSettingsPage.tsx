import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import { TeamsList } from './TeamsList';
import TeamsFilters from './TeamsFilters';
import {
  CreateFirstTeamEmptyState,
  NoTeamsFoundEmptyState,
} from './TeamsEmptyState';
import { CreateTeamDialog } from './CreateTeamDialog';
import { EditTeamDialog } from './EditTeamDialog';
import SettingsLayout from '../../admin-settings-layout';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import type { Team } from '../model/types';

interface TeamsSettingsPageProps {
  teams: Team[];
}

export function TeamsSettingsPage({ teams }: Readonly<TeamsSettingsPageProps>) {
  const { t } = useTranslation('admin-settings-teams');
  const { t: tLayout } = useTranslation('admin-settings-layout');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [search, setSearch] = useState('');

  const hasTeams = teams.length > 0;
  const normalizedSearch = search.trim().toLowerCase();
  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(normalizedSearch),
  );
  const hasSearch = normalizedSearch.length > 0;
  const hasVisibleTeams = filteredTeams.length > 0;
  const showCreateFirstTeamEmptyState = !hasTeams;
  const showNoTeamsFoundEmptyState = hasTeams && hasSearch && !hasVisibleTeams;
  const showTeamsList = hasTeams && hasVisibleTeams;

  const headerActions = (
    <div className="flex gap-2">
      <HelpLink path="settings/admin/teams/" />
      <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
        {t('teams.page.add')}
      </Button>
    </div>
  );

  return (
    <SettingsLayout action={headerActions} title={tLayout('layout.teams')}>
      <div className="space-y-4">
        {hasTeams && <TeamsFilters value={search} onChange={setSearch} />}
        {showCreateFirstTeamEmptyState && <CreateFirstTeamEmptyState />}
        {showNoTeamsFoundEmptyState && <NoTeamsFoundEmptyState />}
        {showTeamsList && (
          <TeamsList teams={filteredTeams} onEditTeam={setEditTeam} />
        )}

        <CreateTeamDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />

        <EditTeamDialog
          team={editTeam}
          open={!!editTeam}
          onOpenChange={(open) => !open && setEditTeam(null)}
        />
      </div>
    </SettingsLayout>
  );
}
