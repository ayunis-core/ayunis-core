import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import { Plus } from 'lucide-react';
import { TeamsList } from './TeamsList';
import { CreateTeamDialog } from './CreateTeamDialog';
import SettingsLayout from '../../admin-settings-layout';
import type { Team } from '../model/types';

interface TeamsSettingsPageProps {
  teams: Team[];
}

export function TeamsSettingsPage({ teams }: TeamsSettingsPageProps) {
  const { t } = useTranslation('admin-settings-teams');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const headerActions = (
    <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
      <Plus className="h-4 w-4" />
      {t('teams.page.add')}
    </Button>
  );

  return (
    <SettingsLayout action={headerActions}>
      <div className="space-y-4">
        <TeamsList teams={teams} />

        <CreateTeamDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </div>
    </SettingsLayout>
  );
}
