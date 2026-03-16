import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui/shadcn/tabs';
import { TeamMembersList } from './TeamMembersList';
import { AddTeamMemberDialog } from './AddTeamMemberDialog';
import { TeamModelsTab } from './TeamModelsTab';
import SettingsLayout from '../../admin-settings-layout';
import type { TeamDetail, PaginatedTeamMembers } from '../model/types';

interface TeamDetailPageProps {
  team: TeamDetail;
  membersResponse: PaginatedTeamMembers;
}

export function TeamDetailPage({
  team,
  membersResponse,
}: Readonly<TeamDetailPageProps>) {
  const { t } = useTranslation('admin-settings-teams');
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('members');

  const headerActions =
    activeTab === 'members' ? (
      <Button size="sm" onClick={() => setAddMemberDialogOpen(true)}>
        {t('teamDetail.addMember.button')}
      </Button>
    ) : null;

  return (
    <SettingsLayout action={headerActions} title={team.name}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="members">
            {t('teamDetail.tabs.members')}
          </TabsTrigger>
          <TabsTrigger value="models">
            {t('teamDetail.tabs.models')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>{t('teamDetail.members.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <TeamMembersList
                teamId={team.id}
                members={membersResponse.data}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models">
          <TeamModelsTab
            teamId={team.id}
            teamName={team.name}
            modelOverrideEnabled={team.modelOverrideEnabled}
          />
        </TabsContent>
      </Tabs>

      <AddTeamMemberDialog
        teamId={team.id}
        open={addMemberDialogOpen}
        onOpenChange={setAddMemberDialogOpen}
      />
    </SettingsLayout>
  );
}
