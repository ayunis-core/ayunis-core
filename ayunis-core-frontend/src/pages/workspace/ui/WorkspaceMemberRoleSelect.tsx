import { useTranslation } from 'react-i18next';
import { MemberRoleSelect } from '@/widgets/member-role-select';
import { useUpdateWorkspaceMemberRole } from '@/pages/workspace/api/useUpdateWorkspaceMemberRole';
import {
  WORKSPACE_ADMIN_ONLY_ITEMS,
  WORKSPACE_ROLE_TRANSLATION,
  WORKSPACE_ROLES,
  type WorkspaceMember,
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
  const { updateWorkspaceMemberRole, isUpdating } =
    useUpdateWorkspaceMemberRole(workspaceId);

  return (
    <MemberRoleSelect
      value={member.role}
      onValueChange={(role) => {
        if (role !== member.role) {
          updateWorkspaceMemberRole(member.userId, role);
        }
      }}
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
