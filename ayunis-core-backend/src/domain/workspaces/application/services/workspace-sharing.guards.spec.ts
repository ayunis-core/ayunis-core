import { randomUUID } from 'crypto';
import { OwnershipViewer } from 'src/domain/ownership/application/models/ownership-viewer';
import { OrgDirectory } from 'src/domain/workspaces/application/models/org-directory';
import { WorkspaceSharingRights } from 'src/domain/workspaces/application/models/workspace-sharing-rights';
import { aWorkspace } from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceMemberNotFoundError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceSharing } from 'src/domain/workspaces/domain/workspace-sharing';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { requireChangeableMember } from './workspace-sharing.guards';
import type { SharingContext } from './workspace-sharing-context.service';

const tobias = randomUUID();
const lena = randomUUID();
const bauamt = randomUUID();
const hauptamt = randomUUID();

const directory = new OrgDirectory(
  [
    { id: tobias, name: 'Tobias', teams: [] },
    {
      id: lena,
      name: 'Lena',
      teams: [
        { id: bauamt, name: 'Bauamt' },
        { id: hauptamt, name: 'Hauptamt' },
      ],
    },
  ],
  [
    { id: bauamt, name: 'Bauamt' },
    { id: hauptamt, name: 'Hauptamt' },
  ],
);

function context(): SharingContext {
  const workspace = aWorkspace({ id: randomUUID(), userId: tobias });
  const sharing = new WorkspaceSharing({
    workspaceId: workspace.id,
    ownerId: tobias,
  });
  sharing.invite(
    { userIds: [], teamIds: [bauamt], level: 'use', at: new Date(1) },
    directory,
  );
  sharing.invite(
    { userIds: [], teamIds: [hauptamt], level: 'use', at: new Date(2) },
    directory,
  );
  const rights = new WorkspaceSharingRights(
    tobias,
    'owner',
    new OwnershipViewer({
      userId: tobias,
      orgId: workspace.orgId,
      isAdmin: false,
      permissions: [Permission.SHARE_WORKSPACES],
      memberTeamIds: [],
      adminTeamIds: [],
      teamAdminPermissions: [],
    }),
  );
  return { workspace, sharing, directory, rights } as SharingContext;
}

describe(requireChangeableMember.name, () => {
  it('changes a person in the team section they are shown in', () => {
    expect(requireChangeableMember(context(), lena, bauamt)).toEqual({
      type: 'team',
      teamId: bauamt,
    });
    expect(requireChangeableMember(context(), lena)).toEqual({
      type: 'team',
      teamId: bauamt,
    });
  });

  it('refuses a team the person belongs to but is not shown under', () => {
    expect(() => requireChangeableMember(context(), lena, hauptamt)).toThrow(
      WorkspaceMemberNotFoundError,
    );
  });
});
