import { randomUUID } from 'crypto';
import { OwnershipViewer } from 'src/domain/ownership/application/models/ownership-viewer';
import { OrgDirectory } from 'src/domain/workspaces/application/models/org-directory';
import { WorkspaceSharingRights } from 'src/domain/workspaces/application/models/workspace-sharing-rights';
import { WorkspaceSharing } from 'src/domain/workspaces/domain/workspace-sharing';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { WorkspaceSharingViewBuilder } from './workspace-sharing-view.builder';

const tobias = randomUUID();
const lena = randomUUID();
const jonas = randomUUID();
const sabine = randomUUID();
const bauamt = randomUUID();

const directory = new OrgDirectory(
  [
    { id: tobias, name: 'Tobias', teams: [{ id: bauamt, name: 'Bauamt' }] },
    { id: lena, name: 'Lena', teams: [{ id: bauamt, name: 'Bauamt' }] },
    { id: jonas, name: 'Jonas', teams: [] },
    { id: sabine, name: 'Sabine', teams: [] },
  ],
  [{ id: bauamt, name: 'Bauamt' }],
);

function build(configure: (sharing: WorkspaceSharing) => void) {
  const sharing = new WorkspaceSharing({
    workspaceId: randomUUID(),
    ownerId: tobias,
  });
  configure(sharing);
  const rights = new WorkspaceSharingRights(
    tobias,
    'owner',
    new OwnershipViewer({
      userId: tobias,
      orgId: randomUUID(),
      isAdmin: false,
      permissions: [
        Permission.SHARE_WORKSPACES,
        Permission.SHARE_WORKSPACES_ORG,
      ],
      memberTeamIds: [bauamt],
      adminTeamIds: [],
      teamAdminPermissions: [],
    }),
  );
  return new WorkspaceSharingViewBuilder(sharing, directory, rights);
}

describe(WorkspaceSharingViewBuilder.name, () => {
  it('shows team members, the owner among them, inside the team section', () => {
    const view = build((sharing) =>
      sharing.invite(
        { userIds: [jonas], teamIds: [bauamt], level: 'use', at: new Date() },
        directory,
      ),
    ).view();

    expect(view.memberCount).toBe(3);
    expect(view.people.map(({ userId }) => userId)).toEqual([jonas]);
    expect(view.teams[0].members).toEqual([
      expect.objectContaining({
        userId: lena,
        accessLevel: 'use',
        canChange: true,
      }),
      expect.objectContaining({
        userId: tobias,
        isOwner: true,
        canChange: false,
      }),
    ]);
    expect(view.organization).toBeNull();
  });

  it('lists everyone else in the organisation section, highest level first', () => {
    const view = build((sharing) => {
      sharing.setSharedWithOrganization(true);
      sharing.setLevel(sabine, 'edit', { type: 'organization' }, directory);
    }).view();

    expect(view.organization?.memberCount).toBe(4);
    expect(view.organization?.members.map(({ userId }) => userId)).toEqual([
      tobias,
      sabine,
      jonas,
      lena,
    ]);
  });

  it('offers only people and teams without access as candidates', () => {
    const candidates = build((sharing) =>
      sharing.invite(
        { userIds: [jonas], teamIds: [], level: 'use', at: new Date() },
        directory,
      ),
    ).candidates();

    expect(candidates.organization).toEqual({ memberCount: 4 });
    expect(candidates.teams.map(({ teamId }) => teamId)).toEqual([bauamt]);
    expect(candidates.people.map(({ userId }) => userId)).toEqual([
      lena,
      sabine,
    ]);
  });

  it('shows the higher level on the team row when a direct invitation is left over', () => {
    const builder = build((sharing) => {
      sharing.invite(
        { userIds: [lena], teamIds: [], level: 'full', at: new Date() },
        new OrgDirectory(
          [{ id: lena, name: 'Lena', teams: [] }],
          [{ id: bauamt, name: 'Bauamt' }],
        ),
      );
      sharing.teams.push({
        teamId: bauamt,
        level: 'use',
        grantedAt: new Date(),
        overrides: new Map(),
      });
    });

    expect(builder.view().teams[0].members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: lena, accessLevel: 'full' }),
      ]),
    );
  });
});
