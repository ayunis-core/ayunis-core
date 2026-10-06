import {
  adminTeamIds,
  canManageWorkspace,
} from '@/widgets/sharing-prototype/model/access';
import {
  teamAdminMay,
  useHasPermission,
  usePrototypeState,
} from '@/widgets/sharing-prototype/model/prototype-store';
import type {
  Person,
  PrototypeWorkspace,
} from '@/widgets/sharing-prototype/model/types';

export function useWorkspaceSharingRights(
  workspace: PrototypeWorkspace,
  person: Person,
) {
  const { role } = usePrototypeState();
  const mayShareByRole = useHasPermission(role, 'share_workspaces');
  const mayShareOrg = useHasPermission(role, 'share_workspaces_org');
  const ownAdminTeamIds = adminTeamIds(person);
  const mayShareAsTeamAdmin =
    ownAdminTeamIds.length > 0 && teamAdminMay('team_share_workspaces');
  const canManage = canManageWorkspace(workspace, person);
  return {
    canManage,
    canInvite: canManage && (mayShareByRole || mayShareAsTeamAdmin),
    inviteScopeTeamIds: mayShareByRole ? undefined : ownAdminTeamIds,
    canShareWithOrg: canManage && mayShareOrg,
  };
}
