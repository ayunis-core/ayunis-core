import {
  adminTeamIds,
  canManageWorkspace,
  findPerson,
  workspaceAccessOf,
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

function keepsAccessWithoutTeam(
  workspace: PrototypeWorkspace,
  person: Person,
  teamId: string,
): boolean {
  const teamGrants = (workspace.teamGrants ?? []).filter(
    (grant) => grant.teamId !== teamId,
  );
  return workspaceAccessOf({ ...workspace, teamGrants }, person) !== null;
}

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
  const canInvite = canManage && (mayShareByRole || mayShareAsTeamAdmin);
  const inScope = (teamIds: string[]) =>
    mayShareByRole || teamIds.some((id) => ownAdminTeamIds.includes(id));
  return {
    canManage,
    canInvite,
    inviteScopeTeamIds: mayShareByRole ? undefined : ownAdminTeamIds,
    canShareWithOrg: canManage && mayShareOrg,
    canChangePerson: (personId: string) =>
      canInvite && inScope(findPerson(personId).teamIds),
    canEndTeam: (teamId: string) =>
      canInvite &&
      inScope([teamId]) &&
      keepsAccessWithoutTeam(workspace, person, teamId),
  };
}
