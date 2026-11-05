import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useUpdateTeamMemberRole } from '@/pages/admin-settings/team-detail/api/useUpdateTeamMemberRole';
import { useTeamRolePermissions } from '@/pages/admin-settings/team-detail/api/useTeamRolePermissions';
import type {
  TeamMember,
  TeamRole,
} from '@/pages/admin-settings/team-detail/model/types';
import { TeamRoleOptions } from './TeamRoleOptions';

interface TeamMemberRoleSelectProps {
  teamId: string;
  member: TeamMember;
}

export function TeamMemberRoleSelect({
  teamId,
  member,
}: Readonly<TeamMemberRoleSelectProps>) {
  const { t } = useTranslation('admin-settings-teams');
  const { confirm } = useConfirmation();
  const { updateTeamMemberRole, isUpdating } = useUpdateTeamMemberRole(teamId);
  const { rolePermissions } = useTeamRolePermissions(teamId);

  const handleChange = (role: TeamRole) => {
    if (role === member.role) return;
    confirm({
      title: t('teamDetail.memberRole.confirmTitle'),
      description: t('teamDetail.memberRole.confirmDescription', {
        name: member.userName,
        role: t(`teamDetail.memberRole.roles.${role}`),
      }),
      confirmText: t('teamDetail.memberRole.confirmButton'),
      cancelText: t('teamDetail.memberRole.cancelButton'),
      onConfirm: () => updateTeamMemberRole(member.userId, role),
    });
  };

  return (
    <Select value={member.role} onValueChange={handleChange}>
      <SelectTrigger
        size="sm"
        disabled={isUpdating}
        aria-label={t('teamDetail.members.role')}
        data-testid={`team-member-role-${member.userId}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <TeamRoleOptions rolePermissions={rolePermissions} />
      </SelectContent>
    </Select>
  );
}
