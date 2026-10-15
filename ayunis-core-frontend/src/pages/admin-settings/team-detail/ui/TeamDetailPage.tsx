import { useTeamManagementAccess } from '@/features/permissions/api/useTeamManagementAccess';
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
import { TeamMembersList, type TeamMemberRights } from './TeamMembersList';
import { PaginationWidget } from '@/widgets/pagination';
import { TEAM_MEMBERS_PER_PAGE } from '@/pages/admin-settings/team-detail/model/constants';
import { AddTeamMemberDialog } from './AddTeamMemberDialog';
import { TeamCreditLimitCard } from './TeamCreditLimitCard';
import SettingsLayout from '@/pages/admin-settings/admin-settings-layout';
import { useHasCreditBudget } from '@/features/credit-limits';
import { MeResponseDtoRole } from '@/shared/api';
import type {
  TeamDetail,
  PaginatedTeamMembers,
} from '@/pages/admin-settings/team-detail/model/types';
import { useAuthorization } from '@/features/permissions';

interface TeamDetailPageProps {
  team: TeamDetail;
  membersResponse: PaginatedTeamMembers;
  page?: number;
}

function useTeamMemberRights(teamId: string): TeamMemberRights {
  const { canManageTeams } = useTeamManagementAccess();
  const { can, hasRole, teamAdminCan } = useAuthorization();
  return {
    canAppoint:
      can('manage_teams') || teamAdminCan(teamId, 'team_appoint_admins'),
    canManageMembers:
      can('assign_users_to_teams') ||
      teamAdminCan(teamId, 'team_manage_members'),
    isAdminViewer: hasRole(MeResponseDtoRole.admin),
    isMutationAllowed: canManageTeams,
  };
}

function MembersCard({
  team,
  membersResponse,
  page,
  rights,
}: Readonly<{
  team: TeamDetail;
  membersResponse: PaginatedTeamMembers;
  page: number;
  rights: TeamMemberRights;
}>) {
  const { t } = useTranslation('admin-settings-teams');
  const total = membersResponse.pagination.total;
  const totalPages = Math.ceil((total ?? 0) / TEAM_MEMBERS_PER_PAGE);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t('teamDetail.members.title')}
          {total !== undefined && (
            <Badge variant="secondary">
              <Users />
              {t('teams.list.memberCount', { count: total })}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>{t('teamDetail.members.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <TeamMembersList
          team={team}
          members={membersResponse.data}
          rights={rights}
        />
        <PaginationWidget
          currentPage={page}
          totalPages={totalPages}
          to="/admin-settings/teams/$id"
          params={{ id: team.id }}
          buildSearchParams={(nextPage) => ({ page: nextPage })}
        />
      </CardContent>
    </Card>
  );
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
  page = 1,
}: Readonly<TeamDetailPageProps>) {
  const { t } = useTranslation('admin-settings-teams');
  const rights = useTeamMemberRights(team.id);
  const canManageTeams = rights.isMutationAllowed;
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  if (!canManageTeams && addMemberDialogOpen) setAddMemberDialogOpen(false);
  const isAdmin = rights.isAdminViewer;
  const hasCreditBudget = useHasCreditBudget(isAdmin);
  const headerActions = rights.canManageMembers && (
    <OnboardingTourTarget name={TOUR_TARGET.addTeamMember}>
      <Button
        size="sm"
        disabled={!canManageTeams}
        data-testid="team-members-add"
        onClick={() => setAddMemberDialogOpen(true)}
      >
        {t('teamDetail.addMember.button')}
      </Button>
    </OnboardingTourTarget>
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
        <MembersCard
          team={team}
          membersResponse={membersResponse}
          page={page}
          rights={rights}
        />
        {isAdmin && <TeamModelSummary team={team} />}
        {isAdmin && hasCreditBudget && (
          <TeamCreditLimitCard
            teamId={team.id}
            teamName={team.name}
            canManage={canManageTeams}
          />
        )}
      </div>
      <AddTeamMemberDialog
        teamId={team.id}
        open={addMemberDialogOpen && canManageTeams}
        onOpenChange={setAddMemberDialogOpen}
      />
    </SettingsLayout>
  );
}
