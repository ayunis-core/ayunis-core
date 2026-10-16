import type { UUID } from 'crypto';
import {
  WorkspaceInsufficientAccessError,
  WorkspaceMemberNotFoundError,
  WorkspaceTeamNotSharedError,
} from 'src/domain/workspaces/application/workspaces.errors';
import type { MemberPlacement } from 'src/domain/workspaces/domain/workspace-sharing';
import type { SharingContext } from './workspace-sharing-context.service';

export function requireInviteRight(context: SharingContext): void {
  if (!context.rights.canInvite) {
    throw new WorkspaceInsufficientAccessError(context.workspace.id);
  }
}

function requireShownRow(
  context: SharingContext,
  userId: UUID,
  teamId?: UUID,
): MemberPlacement {
  const { sharing, directory, workspace } = context;
  const placement = directory.person(userId)
    ? sharing.placementOf(userId, directory)
    : null;
  const shownInTeam = placement?.type === 'team' ? placement.teamId : undefined;
  if (
    !placement ||
    placement.type === 'owner' ||
    (teamId !== undefined && teamId !== shownInTeam)
  ) {
    throw new WorkspaceMemberNotFoundError(workspace.id, userId);
  }
  return placement;
}

export function requireChangeableMember(
  context: SharingContext,
  userId: UUID,
  teamId?: UUID,
): MemberPlacement {
  requireInviteRight(context);
  const { sharing, directory, rights, workspace } = context;
  if (userId === sharing.ownerId || userId === rights.userId) {
    throw new WorkspaceInsufficientAccessError(workspace.id, { userId });
  }
  const placement = requireShownRow(context, userId, teamId);
  const placementTeamId =
    placement.type === 'team' ? placement.teamId : undefined;
  if (!rights.mayChange(userId, directory, placementTeamId)) {
    throw new WorkspaceInsufficientAccessError(workspace.id, { userId });
  }
  return placement;
}

export function requireEndableTeamGrant(
  context: SharingContext,
  teamId: UUID,
): void {
  requireInviteRight(context);
  const { sharing, workspace } = context;
  if (!sharing.teams.some((grant) => grant.teamId === teamId)) {
    throw new WorkspaceTeamNotSharedError(workspace.id, teamId);
  }
  if (!context.rights.mayEndTeamGrant(teamId, sharing, context.directory)) {
    throw new WorkspaceInsufficientAccessError(workspace.id, { teamId });
  }
}
