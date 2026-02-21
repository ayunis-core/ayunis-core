import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/shadcn/table';
import { TeamMembersEmptyState } from './TeamMembersEmptyState';
import { useRemoveTeamMember } from '../api/useRemoveTeamMember';
import type { TeamMember } from '../model/types';

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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeTeamMember(member.userId)}
                disabled={removingUserIds.has(member.userId)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
