jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (
      _target: object,
      _propertyName: string | symbol,
      descriptor: PropertyDescriptor,
    ) =>
      descriptor,
}));

import { randomUUID, type UUID } from 'crypto';
import { OwnershipViewer } from 'src/domain/ownership/application/models/ownership-viewer';
import { OrgDirectory } from 'src/domain/workspaces/application/models/org-directory';
import { WorkspaceSharingRights } from 'src/domain/workspaces/application/models/workspace-sharing-rights';
import type {
  SharingContext,
  WorkspaceSharingContextService,
} from 'src/domain/workspaces/application/services/workspace-sharing-context.service';
import {
  aWorkspace,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import {
  WorkspaceInsufficientAccessError,
  WorkspaceTeamNotSharedError,
} from 'src/domain/workspaces/application/workspaces.errors';
import type { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/workspace-access-level';
import { WorkspaceSharing } from 'src/domain/workspaces/domain/workspace-sharing';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { EndWorkspaceTeamSharingCommand } from './end-workspace-team-sharing.command';
import { EndWorkspaceTeamSharingUseCase } from './end-workspace-team-sharing.use-case';

const lena = randomUUID();
const bauamt = randomUUID();

const directory = new OrgDirectory(
  [
    { id: TEST_USER_ID, name: 'Tobias', teams: [] },
    { id: lena, name: 'Lena', teams: [{ id: bauamt, name: 'Bauamt' }] },
  ],
  [{ id: bauamt, name: 'Bauamt' }],
);

function setup(params: {
  viewerId?: UUID;
  level?: WorkspaceAccessLevel;
  permissions?: Permission[];
}) {
  const viewerId = params.viewerId ?? TEST_USER_ID;
  const sharing = new WorkspaceSharing({
    workspaceId: TEST_WORKSPACE_ID,
    ownerId: TEST_USER_ID,
  });
  sharing.invite(
    { userIds: [], teamIds: [bauamt], level: 'full', at: new Date() },
    directory,
  );
  const rights = new WorkspaceSharingRights(
    viewerId,
    params.level ?? 'owner',
    new OwnershipViewer({
      userId: viewerId,
      orgId: randomUUID(),
      isAdmin: false,
      permissions: params.permissions ?? [Permission.SHARE_WORKSPACES],
      memberTeamIds: [],
      adminTeamIds: [],
      teamAdminPermissions: [],
    }),
  );
  const context = {
    workspace: aWorkspace(),
    sharing,
    directory,
    rights,
  } as unknown as SharingContext;
  const service = {
    load: jest.fn().mockResolvedValue(context),
    save: jest.fn().mockResolvedValue({ unlinkedCount: 1 }),
  };
  return {
    sharing,
    service,
    useCase: new EndWorkspaceTeamSharingUseCase(
      service as unknown as WorkspaceSharingContextService,
    ),
  };
}

function end(useCase: EndWorkspaceTeamSharingUseCase, teamId: UUID = bauamt) {
  return useCase.execute(
    new EndWorkspaceTeamSharingCommand(TEST_WORKSPACE_ID, teamId),
  );
}

describe(EndWorkspaceTeamSharingUseCase.name, () => {
  it('ends the team grant and reports removed links', async () => {
    const { useCase, sharing, service } = setup({});

    await expect(end(useCase)).resolves.toEqual({ unlinkedCount: 1 });
    expect(sharing.teams).toEqual([]);
    expect(service.save).toHaveBeenCalled();
  });

  it('answers 404 for a team without access', async () => {
    const { useCase, service } = setup({});

    await expect(end(useCase, randomUUID())).rejects.toBeInstanceOf(
      WorkspaceTeamNotSharedError,
    );
    expect(service.save).not.toHaveBeenCalled();
  });

  it('needs the right to invite', async () => {
    const { useCase, service } = setup({ permissions: [] });

    await expect(end(useCase)).rejects.toBeInstanceOf(
      WorkspaceInsufficientAccessError,
    );
    expect(service.save).not.toHaveBeenCalled();
  });

  it('does not let people end the share that gives them their own access', async () => {
    const { useCase, sharing, service } = setup({
      viewerId: lena,
      level: 'full',
    });

    await expect(end(useCase)).rejects.toBeInstanceOf(
      WorkspaceInsufficientAccessError,
    );
    expect(sharing.teams).toHaveLength(1);
    expect(service.save).not.toHaveBeenCalled();
  });
});
