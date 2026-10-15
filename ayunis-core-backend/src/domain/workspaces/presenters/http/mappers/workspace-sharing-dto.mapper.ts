import type { WorkspaceSharingOverview } from 'src/domain/workspaces/application/models/workspace-sharing-view';
import type { WorkspaceSharingResponseDto } from 'src/domain/workspaces/presenters/http/dtos/workspace-sharing.dto';

export function toSharingDto(
  view: WorkspaceSharingOverview,
): WorkspaceSharingResponseDto {
  const { viewer } = view;
  return {
    isSharedWithOrganization: view.isSharedWithOrganization,
    memberCount: view.memberCount,
    viewer: {
      accessLevel: viewer.accessLevel,
      canInvite: viewer.canInvite,
      inviteScopeTeamIds: viewer.inviteScopeTeamIds,
      canShareWithOrganization: viewer.canShareWithOrganization,
    },
    owner: view.owner,
    people: view.people,
    teams: view.teams,
    organization: view.organization,
    inviters: view.inviters,
  };
}
