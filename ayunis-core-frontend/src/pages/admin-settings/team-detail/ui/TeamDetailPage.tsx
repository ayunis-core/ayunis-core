import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { OnboardingTourTarget, TOUR_TARGET } from '@/widgets/onboarding';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ayunis/ui/components/tabs';
import { TeamMembersList } from './TeamMembersList';
import { AddTeamMemberDialog } from './AddTeamMemberDialog';
import { TeamModelsTab } from './TeamModelsTab';
import { TeamCreditLimitCard } from './TeamCreditLimitCard';
import SettingsLayout from '@/pages/admin-settings/admin-settings-layout';
import { useHasCreditBudget } from '@/features/credit-limits';
import { MeResponseDtoRole } from '@/shared/api';
import type {
  TeamDetail,
  PaginatedTeamMembers,
} from '@/pages/admin-settings/team-detail/model/types';
import { PermissionGate, useAuthorization } from '@/features/permissions';

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
  const { hasRole } = useAuthorization();
  // Permitted models and credit limits are admin-only endpoints, so managers who
  // reach this page through a teams permission must not see those tabs.
  const isAdmin = hasRole(MeResponseDtoRole.admin);
  const hasCreditBudget = useHasCreditBudget(isAdmin);

  const headerActions =
    activeTab === 'members' ? (
      <PermissionGate permission="assign_users_to_teams">
        <OnboardingTourTarget name={TOUR_TARGET.addTeamMember}>
          <Button size="sm" onClick={() => setAddMemberDialogOpen(true)}>
            {t('teamDetail.addMember.button')}
          </Button>
        </OnboardingTourTarget>
      </PermissionGate>
    ) : null;

  return (
    <SettingsLayout action={headerActions} title={team.name}>
      <Tabs className="gap-4" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="members">
            {t('teamDetail.tabs.members')}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="models" data-testid="team-models-tab">
              {t('teamDetail.tabs.models')}
            </TabsTrigger>
          )}
          {isAdmin && hasCreditBudget && (
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

        {isAdmin && (
          <TabsContent value="models">
            <TeamModelsTab
              teamId={team.id}
              teamName={team.name}
              modelOverrideEnabled={team.modelOverrideEnabled}
            />
          </TabsContent>
        )}

        {isAdmin && hasCreditBudget && (
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
