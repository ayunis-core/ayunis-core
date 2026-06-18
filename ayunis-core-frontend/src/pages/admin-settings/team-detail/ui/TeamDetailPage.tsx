import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Button } from '@/shared/ui/shadcn/button';
import { OnboardingTourTarget } from '@/features/onboarding-tour';
import { TOUR_TARGET } from '@/entities/onboarding';
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
import { TeamCreditLimitCard } from './TeamCreditLimitCard';
import SettingsLayout from '../../admin-settings-layout';
import { useHasCreditBudget } from '@/features/credit-limits';
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
  const { t: tCredit } = useTranslation('admin-settings-credit-limits');
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('members');
  const hasCreditBudget = useHasCreditBudget();

  const headerActions =
    activeTab === 'members' ? (
      <OnboardingTourTarget name={TOUR_TARGET.addTeamMember}>
        <Button size="sm" onClick={() => setAddMemberDialogOpen(true)}>
          {t('teamDetail.addMember.button')}
        </Button>
      </OnboardingTourTarget>
    ) : null;

  return (
    <SettingsLayout action={headerActions} title={team.name}>
      <Tabs className="gap-4" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="members">
            {t('teamDetail.tabs.members')}
          </TabsTrigger>
          <TabsTrigger value="models">
            {t('teamDetail.tabs.models')}
          </TabsTrigger>
          {hasCreditBudget && (
            <TabsTrigger value="credit-limit">
              {tCredit('creditLimits.teamCard.title')}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {t('teamDetail.members.title')}
                {membersResponse.pagination.total !== undefined && (
                  <Badge variant="secondary">
                    <Users />
                    {t('teams.list.memberCount', {
                      count: membersResponse.pagination.total,
                    })}
                  </Badge>
                )}
              </CardTitle>
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

        {hasCreditBudget && (
          <TabsContent value="credit-limit">
            <TeamCreditLimitCard teamId={team.id} teamName={team.name} />
          </TabsContent>
        )}
      </Tabs>

      <AddTeamMemberDialog
        teamId={team.id}
        open={addMemberDialogOpen}
        onOpenChange={setAddMemberDialogOpen}
      />
    </SettingsLayout>
  );
}
