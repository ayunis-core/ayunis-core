import type { UUID } from 'crypto';
import type { OwnershipViewer } from 'src/domain/ownership/application/models/ownership-viewer';
import type { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/workspace-access-level';
import type {
  TeamMembership,
  WorkspaceSharing,
} from 'src/domain/workspaces/domain/workspace-sharing';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { TeamAdminPermission } from 'src/iam/permissions/domain/value-objects/team-admin-permission.enum';

export class WorkspaceSharingRights {
  readonly canManage: boolean;
  readonly canInvite: boolean;
  readonly inviteScopeTeamIds: UUID[] | null;
  readonly canShareWithOrganization: boolean;

  constructor(
    readonly userId: UUID,
    readonly accessLevel: WorkspaceAccessLevel,
    viewer: OwnershipViewer,
  ) {
    this.canManage = accessLevel === 'owner' || accessLevel === 'full';
    const hasRoleRight = viewer.has(Permission.SHARE_WORKSPACES);
    const teamScope = viewer.teamIdsWithAdminRight(
      TeamAdminPermission.TEAM_SHARE_WORKSPACES,
    );
    this.canInvite = this.canManage && (hasRoleRight || teamScope.length > 0);
    this.inviteScopeTeamIds = hasRoleRight ? null : teamScope;
    this.canShareWithOrganization =
      this.canManage && viewer.has(Permission.SHARE_WORKSPACES_ORG);
  }

  mayInviteTeam(teamId: UUID): boolean {
    return (
      this.canInvite &&
      (this.inviteScopeTeamIds === null ||
        this.inviteScopeTeamIds.includes(teamId))
    );
  }

  mayEndTeamGrant(
    teamId: UUID,
    sharing: WorkspaceSharing,
    membership: TeamMembership,
  ): boolean {
    return (
      this.mayInviteTeam(teamId) &&
      sharing.levelWithoutTeam(teamId, this.userId, membership) !== null
    );
  }

  mayChange(userId: UUID, membership: TeamMembership, teamId?: UUID): boolean {
    return (
      this.mayReach(userId, membership) &&
      (teamId === undefined || this.mayInviteTeam(teamId))
    );
  }

  mayReach(userId: UUID, membership: TeamMembership): boolean {
    if (!this.canInvite) return false;
    if (this.inviteScopeTeamIds === null) return true;
    const scope = this.inviteScopeTeamIds;
    return membership.teamsOf(userId).some((teamId) => scope.includes(teamId));
  }
}
