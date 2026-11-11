import { useTranslation } from 'react-i18next';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { MemberRoleSelect } from '@/widgets/member-role-select';
import { useUpdateWorkspaceMemberRole } from '@/pages/workspace/api/useUpdateWorkspaceMemberRole';
import {
  WORKSPACE_ADMIN_ONLY_ITEMS,
  WORKSPACE_ROLE_TRANSLATION,
  WORKSPACE_ROLES,
  type WorkspaceMember,
  type WorkspaceRole,
  type WorkspaceRolePermissionSet,
} from '@/pages/workspace/model/workspace-members';

interface WorkspaceMemberRoleSelectProps {
  workspaceId: string;
  member: WorkspaceMember;
  rolePermissions: readonly WorkspaceRolePermissionSet[] | undefined;
}

export function WorkspaceMemberRoleSelect({
  workspaceId,
  member,
  rolePermissions,
}: Readonly<WorkspaceMemberRoleSelectProps>) {
  const { t } = useTranslation('workspace');
  const { confirm } = useConfirmation();
  const { updateWorkspaceMemberRole, isUpdating } =
    useUpdateWorkspaceMemberRole(workspaceId);

  const handleChange = (role: WorkspaceRole) => {
    if (role === member.role) return;
    confirm({
      title: t('members.role.confirmTitle'),
      description: t('members.role.confirmDescription', {
        name: member.name,
        role: t(`members.role.roles.${role}`),
      }),
      confirmText: t('members.role.confirmButton'),
      cancelText: t('members.role.cancelButton'),
      onConfirm: () => updateWorkspaceMemberRole(member.userId, role),
    });
  };

  return (
    <MemberRoleSelect
      value={member.role}
      onValueChange={handleChange}
      roles={WORKSPACE_ROLES}
      rolePermissions={rolePermissions}
      adminOnlyItems={WORKSPACE_ADMIN_ONLY_ITEMS}
      translation={WORKSPACE_ROLE_TRANSLATION}
      ariaLabel={t('members.role.label')}
      disabled={isUpdating}
      triggerTestId={`workspace-member-role-${member.userId}`}
      testIdPrefix="workspace-member-role"
    />
  );
}
