import { Trash2, Users } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ayunis/ui/components/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { showSuccess } from '@/shared/lib/toast';
import { EmptyState } from '@/widgets/empty-state';
import { PaginationWidget } from '@/widgets/pagination';
import {
  isTeamAdminWith,
  managedTeams,
  personForRole,
  teamMembers,
} from '@/widgets/sharing-prototype/model/access';
import { joinedDate } from '@/widgets/sharing-prototype/model/member-fixtures';
import {
  removeTeamMember,
  setTeamAdmin,
  useHasPermission,
  usePrototypeState,
} from '@/widgets/sharing-prototype/model/prototype-store';
import type {
  Person,
  Role,
  Team,
} from '@/widgets/sharing-prototype/model/types';
import { TeamCreditLimitCard, TeamModelsCard } from './TeamSettingsCards';

type TeamRole = 'member' | 'teamAdmin';

const MEMBERS_PER_PAGE = 25;

const TEAM_ROLE_LABEL: Record<TeamRole, string> = {
  member: 'Mitglied',
  teamAdmin: 'Team-Admin',
};

function RoleCell({
  team,
  member,
  canAppoint,
}: Readonly<{ team: Team; member: Person; canAppoint: boolean }>) {
  const current: TeamRole = team.adminIds.includes(member.id)
    ? 'teamAdmin'
    : 'member';
  if (!canAppoint) return <>{TEAM_ROLE_LABEL[current]}</>;

  function change(next: string) {
    const isAdmin = next === 'teamAdmin';
    setTeamAdmin(team.id, team.adminIds, member.id, isAdmin);
    showSuccess(
      `${member.name} ist jetzt ${isAdmin ? 'Team-Admin' : 'Mitglied'} von Team ${team.name}.`,
    );
  }

  return (
    <Select value={current} onValueChange={change}>
      <SelectTrigger className="w-40" aria-label={`Rolle von ${member.name}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="member">{TEAM_ROLE_LABEL.member}</SelectItem>
        <SelectItem value="teamAdmin">{TEAM_ROLE_LABEL.teamAdmin}</SelectItem>
      </SelectContent>
    </Select>
  );
}

function RemoveMemberButton({
  team,
  member,
}: Readonly<{ team: Team; member: Person }>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          aria-label={`${member.name} aus dem Team entfernen`}
          onClick={() => {
            removeTeamMember(team.id, team.adminIds, member.id);
            showSuccess(`${member.name} ist nicht mehr im Team ${team.name}.`);
          }}
        >
          <Trash2 />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Aus dem Team entfernen</TooltipContent>
    </Tooltip>
  );
}

function isOnlyTeamAdmin(team: Team, member: Person): boolean {
  return team.adminIds.length === 1 && team.adminIds[0] === member.id;
}

function MemberRow({
  team,
  member,
  canAppoint,
  canRemove,
  isAdminViewer,
}: Readonly<{
  team: Team;
  member: Person;
  canAppoint: boolean;
  canRemove: boolean;
  isAdminViewer: boolean;
}>) {
  const isProtected = !isAdminViewer && isOnlyTeamAdmin(team, member);
  return (
    <TableRow>
      <TableCell className="font-medium">{member.name}</TableCell>
      <TableCell>{member.email}</TableCell>
      <TableCell>
        <RoleCell
          team={team}
          member={member}
          canAppoint={canAppoint && !isProtected}
        />
      </TableCell>
      <TableCell>{joinedDate(member.id, team.id)}</TableCell>
      <TableCell>
        {canRemove && !isProtected && (
          <RemoveMemberButton team={team} member={member} />
        )}
      </TableCell>
    </TableRow>
  );
}

function MembersCard({
  team,
  page,
  canAppoint,
  canRemove,
  isAdminViewer,
}: Readonly<{
  team: Team;
  page: number;
  canAppoint: boolean;
  canRemove: boolean;
  isAdminViewer: boolean;
}>) {
  const allMembers = teamMembers(team.id);
  const totalPages = Math.max(
    1,
    Math.ceil(allMembers.length / MEMBERS_PER_PAGE),
  );
  const currentPage = Math.min(page, totalPages);
  const members = allMembers.slice(
    (currentPage - 1) * MEMBERS_PER_PAGE,
    currentPage * MEMBERS_PER_PAGE,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Mitglieder
          <Badge variant="secondary">
            <Users />
            {allMembers.length} Mitglieder
          </Badge>
        </CardTitle>
        <CardDescription>
          Team-Admins verwalten das Team. Was sie dürfen, legen Admins unter
          Rollen &amp; Berechtigungen fest.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>E-Mail</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>Beigetreten</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <MemberRow
                key={member.id}
                team={team}
                member={member}
                canAppoint={canAppoint}
                canRemove={canRemove}
                isAdminViewer={isAdminViewer}
              />
            ))}
          </TableBody>
        </Table>
        <PaginationWidget
          currentPage={currentPage}
          totalPages={totalPages}
          to="/admin-settings/teams/$id"
          params={{ id: team.id }}
          buildSearchParams={(targetPage) => ({ page: targetPage })}
        />
      </CardContent>
    </Card>
  );
}

function useTeamRights(teamId: string, role: Role) {
  const person = personForRole(role);
  const mayAppointAll = useHasPermission(role, 'manage_teams');
  const mayAssignAll = useHasPermission(role, 'assign_users_to_teams');
  return {
    canAppoint:
      mayAppointAll || isTeamAdminWith(teamId, person, 'team_appoint_admins'),
    canRemove:
      mayAssignAll || isTeamAdminWith(teamId, person, 'team_manage_members'),
  };
}

export function PrototypeTeamDetail({
  teamId,
  page,
}: Readonly<{ teamId: string; page: number }>) {
  const { role } = usePrototypeState();
  const { canAppoint, canRemove } = useTeamRights(teamId, role);
  const team = managedTeams(personForRole(role), role).find(
    (candidate) => candidate.id === teamId,
  );
  if (!team) {
    return (
      <EmptyState
        title="Dieses Team können Sie nicht verwalten"
        description="Öffnen Sie ein Team aus der Liste."
      />
    );
  }
  return (
    <div className="space-y-4">
      <MembersCard
        team={team}
        page={page}
        canAppoint={canAppoint}
        canRemove={canRemove}
        isAdminViewer={role === 'orgAdmin'}
      />
      {role === 'orgAdmin' && (
        <>
          <TeamModelsCard />
          <TeamCreditLimitCard />
        </>
      )}
    </div>
  );
}
