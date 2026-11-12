import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ayunis/ui/components/table';
import { TeamMembersEmptyState } from './TeamMembersEmptyState';
import { TeamMemberRoleSelect } from './TeamMemberRoleSelect';
import { useRemoveTeamMember } from '@/pages/admin-settings/team-detail/api/useRemoveTeamMember';
import type { TeamMember } from '@/pages/admin-settings/team-detail/model/types';
import { useAuthorization } from '@/features/permissions';

interface TeamMembersListProps {
  teamId: string;
  members: TeamMember[];
}

export function TeamMembersList({
  teamId,
  members,
}: Readonly<TeamMembersListProps>) {
  const { t } = useTranslation('admin-settings-teams');
  const { removeTeamMember, removingUserIds } = useRemoveTeamMember(teamId);
  const { canInTeam, canManageTeamRoles, isLoading } = useAuthorization();
  const canManageRoles = !isLoading && canManageTeamRoles(teamId);
  const canRemove = (member: TeamMember) =>
    !isLoading &&
    canInTeam(teamId, 'assign_users_to_teams') &&
    (member.role !== 'admin' || canManageRoles);

  if (members.length === 0) {
    return <TeamMembersEmptyState />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('teamDetail.members.name')}</TableHead>
          <TableHead>{t('teamDetail.members.email')}</TableHead>
          <TableHead>{t('teamDetail.members.role')}</TableHead>
          <TableHead>{t('teamDetail.members.joinedAt')}</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow
            key={member.id}
            data-testid={`team-member-${member.userId}`}
          >
            <TableCell className="font-medium">{member.userName}</TableCell>
            <TableCell>{member.userEmail}</TableCell>
            <TableCell>
              {canManageRoles ? (
                <TeamMemberRoleSelect teamId={teamId} member={member} />
              ) : (
                t(`teamDetail.memberRole.roles.${member.role}`)
              )}
            </TableCell>
            <TableCell>
              {new Date(member.joinedAt).toLocaleDateString()}
            </TableCell>
            <TableCell>
              {canRemove(member) && (
                <Button
                  variant="destructive-ghost"
                  size="icon"
                  onClick={() => removeTeamMember(member.userId)}
                  disabled={removingUserIds.has(member.userId)}
                  data-testid={`team-member-remove-${member.userId}`}
                >
                  <Trash2 />
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
