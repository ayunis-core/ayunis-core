import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { TeamMembersList } from './TeamMembersList';
import { AddTeamMemberDialog } from './AddTeamMemberDialog';
import SettingsLayout from '../../admin-settings-layout';
import type { TeamDetail, PaginatedTeamMembers } from '../model/types';

interface TeamDetailPageProps {
  team: TeamDetail;
  membersResponse: PaginatedTeamMembers;
}

export function TeamDetailPage({ team, membersResponse }: TeamDetailPageProps) {
  const { t } = useTranslation('admin-settings-teams');
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);

  const headerActions = (
    <Button size="sm" onClick={() => setAddMemberDialogOpen(true)}>
      {t('teamDetail.addMember.button')}
    </Button>
  );

  return (
    <SettingsLayout action={headerActions} title={team.name}>
      <Card>
        <CardHeader>
          <CardTitle>{t('teamDetail.members.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamMembersList teamId={team.id} members={membersResponse.data} />
        </CardContent>
      </Card>

      <AddTeamMemberDialog
        teamId={team.id}
        open={addMemberDialogOpen}
        onOpenChange={setAddMemberDialogOpen}
      />
    </SettingsLayout>
  );
}
