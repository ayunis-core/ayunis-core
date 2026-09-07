import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { Users } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { OnboardingTourTarget, TOUR_TARGET } from '@/widgets/onboarding';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { TeamMembersList } from './TeamMembersList';
import { AddTeamMemberDialog } from './AddTeamMemberDialog';
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

function TeamModelSummary({ team }: Readonly<{ team: TeamDetail }>) {
  const { t } = useTranslation('admin-settings-teams');
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('teamDetail.tabs.models')}</CardTitle>
        <CardDescription>
          {t(
            team.modelOverrideEnabled
              ? 'teamDetail.policyLinks.customModels'
              : 'teamDetail.policyLinks.organizationModels',
          )}
        </CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" asChild>
            <Link
              to="/admin-settings/models/teams/$id"
              params={{ id: team.id }}
              data-testid="team-manage-models"
            >
              {t('teamDetail.policyLinks.manageModels')}
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

export function TeamDetailPage({
  team,
  membersResponse,
}: Readonly<TeamDetailPageProps>) {
  const { t } = useTranslation('admin-settings-teams');
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const { hasRole } = useAuthorization();
  const isAdmin = hasRole(MeResponseDtoRole.admin);
  const hasCreditBudget = useHasCreditBudget(isAdmin);
  const headerActions = (
    <PermissionGate permission="assign_users_to_teams">
      <OnboardingTourTarget name={TOUR_TARGET.addTeamMember}>
        <Button size="sm" onClick={() => setAddMemberDialogOpen(true)}>
          {t('teamDetail.addMember.button')}
        </Button>
      </OnboardingTourTarget>
    </PermissionGate>
  );

  return (
    <SettingsLayout
      action={headerActions}
      breadcrumbs={[
        { label: t('teamDetail.backToTeams'), href: '/admin-settings/teams' },
        { label: team.name },
      ]}
    >
      <div className="space-y-4">
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
            <TeamMembersList teamId={team.id} members={membersResponse.data} />
          </CardContent>
        </Card>
        {isAdmin && <TeamModelSummary team={team} />}
        {isAdmin && hasCreditBudget && (
          <TeamCreditLimitCard teamId={team.id} teamName={team.name} />
        )}
      </div>
      <AddTeamMemberDialog
        teamId={team.id}
        open={addMemberDialogOpen}
        onOpenChange={setAddMemberDialogOpen}
      />
    </SettingsLayout>
  );
}
