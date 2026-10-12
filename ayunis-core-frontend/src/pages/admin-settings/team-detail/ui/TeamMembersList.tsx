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
import { useRemoveTeamMember } from '@/pages/admin-settings/team-detail/api/useRemoveTeamMember';
import type { TeamMember } from '@/pages/admin-settings/team-detail/model/types';
import { PermissionGate } from '@/features/permissions';

interface TeamMembersListProps {
  teamId: string;
  members: TeamMember[];
  canManage?: boolean;
}

export function TeamMembersList({
  teamId,
  members,
  canManage = true,
}: Readonly<TeamMembersListProps>) {
  const { t } = useTranslation('admin-settings-teams');
  const { removeTeamMember, removingUserIds } = useRemoveTeamMember(teamId);

  if (members.length === 0) {
    return <TeamMembersEmptyState />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('teamDetail.members.name')}</TableHead>
          <TableHead>{t('teamDetail.members.email')}</TableHead>
          <TableHead>{t('teamDetail.members.joinedAt')}</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell className="font-medium">{member.userName}</TableCell>
            <TableCell>{member.userEmail}</TableCell>
            <TableCell>
              {new Date(member.joinedAt).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <PermissionGate permission="assign_users_to_teams">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeTeamMember(member.userId)}
                  disabled={!canManage || removingUserIds.has(member.userId)}
                  data-testid={`team-member-remove-${member.userId}`}
                >
                  <Trash2 />
                </Button>
              </PermissionGate>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
