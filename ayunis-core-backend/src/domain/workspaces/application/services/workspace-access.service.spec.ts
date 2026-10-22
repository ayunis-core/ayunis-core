import { randomUUID } from 'crypto';
import type { WorkspaceSharingRepository } from 'src/domain/workspaces/application/ports/workspace-sharing.repository';
import {
  WorkspaceInsufficientAccessError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import {
  aWorkspace,
  createMockContextService,
  createMockWorkspacesRepository,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceSharing } from 'src/domain/workspaces/domain/workspace-sharing';
import type { ListMyTeamsUseCase } from 'src/iam/teams/application/use-cases/list-my-teams/list-my-teams.use-case';
import { WorkspaceAccessService } from './workspace-access.service';

function setup(caller = randomUUID()) {
  const ownerId = randomUUID();
  const workspace = aWorkspace({ userId: ownerId });
  const sharing = new WorkspaceSharing({
    workspaceId: workspace.id,
    ownerId,
  });
  const repository = createMockWorkspacesRepository();
  repository.findOne.mockResolvedValue(workspace);
  const sharingRepository = {
    loadMany: jest.fn().mockResolvedValue(new Map([[workspace.id, sharing]])),
  };
  const listMyTeams = { execute: jest.fn().mockResolvedValue([]) };
  return {
    ownerId,
    caller,
    sharing,
    repository,
    service: new WorkspaceAccessService(
      repository,
      sharingRepository as unknown as WorkspaceSharingRepository,
      createMockContextService({ userId: caller, orgId: workspace.orgId }),
      listMyTeams as unknown as ListMyTeamsUseCase,
    ),
  };
}

describe(WorkspaceAccessService.name, () => {
  it('gives the owner every level', async () => {
    const ownerId = randomUUID();
    const { service, repository } = setup(ownerId);
    repository.findOne.mockResolvedValue(aWorkspace({ userId: ownerId }));

    await expect(
      service.require(TEST_WORKSPACE_ID, 'owner'),
    ).resolves.toMatchObject({ level: 'owner' });
  });

  it('hides a workspace from people without any access', async () => {
    const { service } = setup();

    await expect(
      service.require(TEST_WORKSPACE_ID, 'use'),
    ).rejects.toBeInstanceOf(WorkspaceNotFoundError);
  });

  it('refuses a member whose level is too low with 403', async () => {
    const { service, sharing, caller } = setup();
    sharing.people.set(caller, 'use');

    await expect(
      service.require(TEST_WORKSPACE_ID, 'use'),
    ).resolves.toMatchObject({
      level: 'use',
    });
    await expect(
      service.require(TEST_WORKSPACE_ID, 'edit'),
    ).rejects.toBeInstanceOf(WorkspaceInsufficientAccessError);
  });

  it('hides a workspace of another organisation', async () => {
    const { service, repository } = setup();
    repository.findOne.mockResolvedValue(aWorkspace({ orgId: randomUUID() }));

    await expect(
      service.require(TEST_WORKSPACE_ID, 'use'),
    ).rejects.toBeInstanceOf(WorkspaceNotFoundError);
  });
});
