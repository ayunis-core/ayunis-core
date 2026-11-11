import { useTranslation } from 'react-i18next';
import { useConfirmation } from '@/widgets/confirmation-modal';
import {
  MemberRoleSelect,
  type MemberRoleTranslation,
} from '@/widgets/member-role-select';
import { useUpdateTeamMemberRole } from '@/pages/admin-settings/team-detail/api/useUpdateTeamMemberRole';
import { useTeamRolePermissions } from '@/pages/admin-settings/team-detail/api/useTeamRolePermissions';
import {
  TEAM_ROLES,
  type TeamMember,
  type TeamRole,
} from '@/pages/admin-settings/team-detail/model/types';

const ROLE_TRANSLATION: MemberRoleTranslation = {
  namespace: 'admin-settings-teams',
  keyPrefix: 'teamDetail.memberRole',
};

// Not a matrix permission: the backend reserves role changes and removing
// team admins for team admins.
const ADMIN_ONLY_ITEMS = ['manage_roles'];

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
    <MemberRoleSelect
      value={member.role}
      onValueChange={handleChange}
      roles={TEAM_ROLES}
      rolePermissions={rolePermissions}
      adminOnlyItems={ADMIN_ONLY_ITEMS}
      translation={ROLE_TRANSLATION}
      ariaLabel={t('teamDetail.members.role')}
      disabled={isUpdating}
      triggerTestId={`team-member-role-${member.userId}`}
      testIdPrefix="team-member-role"
    />
  );
}
