import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import { Plus } from 'lucide-react';
import { TeamsList } from './TeamsList';
import { CreateTeamDialog } from './CreateTeamDialog';
import { EditTeamDialog } from './EditTeamDialog';
import SettingsLayout from '../../admin-settings-layout';
import type { Team } from '../model/types';

interface TeamsSettingsPageProps {
  teams: Team[];
}

export function TeamsSettingsPage({ teams }: TeamsSettingsPageProps) {
  const { t } = useTranslation('admin-settings-teams');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);

  const headerActions = (
    <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
      <Plus className="h-4 w-4" />
      {t('teams.page.add')}
    </Button>
  );

  return (
    <SettingsLayout action={headerActions}>
      <div className="space-y-4">
        <TeamsList teams={teams} onEditTeam={setEditTeam} />

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
