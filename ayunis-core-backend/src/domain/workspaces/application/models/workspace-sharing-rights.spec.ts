import { randomUUID } from 'crypto';
import { OwnershipViewer } from 'src/domain/ownership/application/models/ownership-viewer';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { TeamAdminPermission } from 'src/iam/permissions/domain/value-objects/team-admin-permission.enum';
import { WorkspaceSharing } from 'src/domain/workspaces/domain/workspace-sharing';
import { OrgDirectory } from './org-directory';
import { WorkspaceSharingRights } from './workspace-sharing-rights';

const userId = randomUUID();
const bauamt = randomUUID();
const hauptamt = randomUUID();
const lena = randomUUID();
const sabine = randomUUID();

const directory = new OrgDirectory(
  [
    { id: lena, name: 'Lena', teams: [{ id: bauamt, name: 'Bauamt' }] },
    { id: sabine, name: 'Sabine', teams: [{ id: hauptamt, name: 'Hauptamt' }] },
  ],
  [
    { id: bauamt, name: 'Bauamt' },
    { id: hauptamt, name: 'Hauptamt' },
  ],
);

function viewer(params: {
  permissions?: Permission[];
  adminTeamIds?: string[];
  teamAdminPermissions?: TeamAdminPermission[];
}) {
  return new OwnershipViewer({
    userId,
    orgId: randomUUID(),
    isAdmin: false,
    permissions: params.permissions ?? [],
    memberTeamIds: [],
    adminTeamIds: (params.adminTeamIds ?? []) as never[],
    teamAdminPermissions: params.teamAdminPermissions ?? [],
  });
}

describe(WorkspaceSharingRights.name, () => {
  it('lets owners and full members with the role right invite anyone', () => {
    const rights = new WorkspaceSharingRights(
      userId,
      'full',
      viewer({ permissions: [Permission.SHARE_WORKSPACES] }),
    );

    expect(rights).toMatchObject({
      canInvite: true,
      inviteScopeTeamIds: null,
      canShareWithOrganization: false,
    });
    expect(rights.mayReach(sabine, directory)).toBe(true);
  });

  it('limits team admins without the role right to their own teams', () => {
    const rights = new WorkspaceSharingRights(
      userId,
      'owner',
      viewer({
        adminTeamIds: [bauamt],
        teamAdminPermissions: [TeamAdminPermission.TEAM_SHARE_WORKSPACES],
      }),
    );

    expect(rights.inviteScopeTeamIds).toEqual([bauamt]);
    expect(rights.mayInviteTeam(bauamt)).toBe(true);
    expect(rights.mayInviteTeam(hauptamt)).toBe(false);
    expect(rights.mayReach(lena, directory)).toBe(true);
    expect(rights.mayReach(sabine, directory)).toBe(false);
  });

  it('never lets "Kann bearbeiten" invite, whatever the role allows', () => {
    const rights = new WorkspaceSharingRights(
      userId,
      'edit',
      viewer({
        permissions: [
          Permission.SHARE_WORKSPACES,
          Permission.SHARE_WORKSPACES_ORG,
        ],
      }),
    );

    expect(rights.canInvite).toBe(false);
    expect(rights.canShareWithOrganization).toBe(false);
  });

  it('needs the organisation right to share with everyone', () => {
    const rights = new WorkspaceSharingRights(
      userId,
      'owner',
      viewer({ permissions: [Permission.SHARE_WORKSPACES_ORG] }),
    );

    expect(rights.canShareWithOrganization).toBe(true);
    expect(rights.canInvite).toBe(false);
  });
  it('lets people end a team share they may manage, unless they would lose access', () => {
    const rights = new WorkspaceSharingRights(
      lena,
      'full',
      viewer({ permissions: [Permission.SHARE_WORKSPACES] }),
    );
    const sharing = new WorkspaceSharing({
      workspaceId: randomUUID(),
      ownerId: userId,
    });
    sharing.invite(
      {
        userIds: [],
        teamIds: [bauamt, hauptamt],
        level: 'full',
        at: new Date(),
      },
      directory,
    );

    expect(rights.mayEndTeamGrant(hauptamt, sharing, directory)).toBe(true);
    expect(rights.mayEndTeamGrant(bauamt, sharing, directory)).toBe(false);
  });

  it('keeps team admins to their own teams when ending a team share', () => {
    const rights = new WorkspaceSharingRights(
      userId,
      'owner',
      viewer({
        adminTeamIds: [bauamt],
        teamAdminPermissions: [TeamAdminPermission.TEAM_SHARE_WORKSPACES],
      }),
    );
    const sharing = new WorkspaceSharing({
      workspaceId: randomUUID(),
      ownerId: userId,
    });

    expect(rights.mayEndTeamGrant(bauamt, sharing, directory)).toBe(true);
    expect(rights.mayEndTeamGrant(hauptamt, sharing, directory)).toBe(false);
  });
  it('lets team admins change a person only inside the teams they administer', () => {
    const rights = new WorkspaceSharingRights(
      userId,
      'owner',
      viewer({
        adminTeamIds: [bauamt],
        teamAdminPermissions: [TeamAdminPermission.TEAM_SHARE_WORKSPACES],
      }),
    );

    expect(rights.mayChange(lena, directory)).toBe(true);
    expect(rights.mayChange(lena, directory, bauamt)).toBe(true);
    expect(rights.mayChange(lena, directory, hauptamt)).toBe(false);
    expect(rights.mayChange(sabine, directory)).toBe(false);
  });
});
