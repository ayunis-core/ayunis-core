import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
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
import { TeamMembersEmptyState } from './TeamMembersEmptyState';
import { useRemoveTeamMember } from '@/pages/admin-settings/team-detail/api/useRemoveTeamMember';
import { useSetTeamAdmin } from '@/pages/admin-settings/team-detail/api/useSetTeamAdmin';
import type {
  TeamDetail,
  TeamMember,
} from '@/pages/admin-settings/team-detail/model/types';

type TeamRole = 'member' | 'teamAdmin';

export interface TeamMemberRights {
  canAppoint: boolean;
  canManageMembers: boolean;
  isAdminViewer: boolean;
}

interface TeamMembersListProps {
  team: TeamDetail;
  members: TeamMember[];
  rights: TeamMemberRights;
}

function isOnlyTeamAdmin(team: TeamDetail, member: TeamMember): boolean {
  const admins = team.teamAdmins ?? [];
  return admins.length === 1 && admins[0].userId === member.userId;
}

function RoleCell({
  team,
  member,
  editable,
}: Readonly<{
  team: TeamDetail;
  member: TeamMember;
  editable: boolean;
}>) {
  const { t } = useTranslation('admin-settings-teams');
  const { setTeamAdmin, isSettingTeamAdmin } = useSetTeamAdmin(
    team.id,
    team.name,
  );
  const role: TeamRole = member.isTeamAdmin ? 'teamAdmin' : 'member';
  const testId = `team-member-role-${member.userId}`;

  if (!editable) {
    return (
      <span data-testid={testId}>{t(`teamDetail.members.roles.${role}`)}</span>
    );
  }

  return (
    <Select
      value={role}
      disabled={isSettingTeamAdmin}
      onValueChange={(next) =>
        setTeamAdmin({
          userId: member.userId,
          userName: member.userName,
          isTeamAdmin: next === 'teamAdmin',
        })
      }
    >
      <SelectTrigger
        className="w-40"
        aria-label={t('teamDetail.members.roleLabel', {
          name: member.userName,
        })}
        data-testid={testId}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="member">
          {t('teamDetail.members.roles.member')}
        </SelectItem>
        <SelectItem value="teamAdmin">
          {t('teamDetail.members.roles.teamAdmin')}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

function RemoveMemberButton({
  member,
  disabled,
  onRemove,
}: Readonly<{
  member: TeamMember;
  disabled: boolean;
  onRemove: () => void;
}>) {
  const { t } = useTranslation('admin-settings-teams');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          aria-label={t('teamDetail.members.removeLabel', {
            name: member.userName,
          })}
          onClick={onRemove}
          disabled={disabled}
          data-testid={`team-member-remove-${member.userId}`}
        >
          <Trash2 />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t('teamDetail.members.remove')}</TooltipContent>
    </Tooltip>
  );
}

function MemberRow({
  team,
  member,
  rights,
  isRemoving,
  onRemove,
}: Readonly<{
  team: TeamDetail;
  member: TeamMember;
  rights: TeamMemberRights;
  isRemoving: boolean;
  onRemove: () => void;
}>) {
  const isProtected = !rights.isAdminViewer && isOnlyTeamAdmin(team, member);
  const canRemove =
    rights.canManageMembers &&
    !isProtected &&
    (!member.isTeamAdmin || rights.canAppoint);

  return (
    <TableRow data-testid={`team-member-${member.userId}`}>
      <TableCell className="font-medium">{member.userName}</TableCell>
      <TableCell>{member.userEmail}</TableCell>
      <TableCell>
        <RoleCell
          team={team}
          member={member}
          editable={rights.canAppoint && !isProtected}
        />
      </TableCell>
      <TableCell>{new Date(member.joinedAt).toLocaleDateString()}</TableCell>
      <TableCell>
        {canRemove && (
          <RemoveMemberButton
            member={member}
            disabled={isRemoving}
            onRemove={onRemove}
          />
        )}
      </TableCell>
    </TableRow>
  );
}

export function TeamMembersList({
  team,
  members,
  rights,
}: Readonly<TeamMembersListProps>) {
  const { t } = useTranslation('admin-settings-teams');
  const { removeTeamMember, removingUserIds } = useRemoveTeamMember(
    team.id,
    team.name,
  );

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
          <MemberRow
            key={member.id}
            team={team}
            member={member}
            rights={rights}
            isRemoving={removingUserIds.has(member.userId)}
            onRemove={() =>
              removeTeamMember({
                userId: member.userId,
                userName: member.userName,
              })
            }
          />
        ))}
      </TableBody>
    </Table>
  );
}
