import { randomUUID } from 'crypto';
import { OrgDirectory } from 'src/domain/workspaces/application/models/org-directory';
import type { WorkspaceSharingRepository } from 'src/domain/workspaces/application/ports/workspace-sharing.repository';
import type { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceOwnershipService } from 'src/domain/workspaces/application/services/workspace-ownership.service';
import type {
  SharingContext,
  WorkspaceSharingContextService,
} from 'src/domain/workspaces/application/services/workspace-sharing-context.service';
import {
  aWorkspace,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceOwnerOnlyError } from 'src/domain/workspaces/application/workspaces.errors';
import type { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/workspace-access-level';
import { WorkspaceSharing } from 'src/domain/workspaces/domain/workspace-sharing';
import { ListOwnershipCandidatesUseCase } from './list-ownership-candidates.use-case';

const lena = randomUUID();
const sabine = randomUUID();
const bauamt = randomUUID();

const directory = new OrgDirectory(
  [
    { id: TEST_USER_ID, name: 'Tobias', teams: [] },
    { id: lena, name: 'Lena', teams: [{ id: bauamt, name: 'Bauamt' }] },
    { id: sabine, name: 'Sabine', teams: [] },
  ],
  [{ id: bauamt, name: 'Bauamt' }],
);

function setup(level: WorkspaceAccessLevel) {
  const sharing = new WorkspaceSharing({
    workspaceId: TEST_WORKSPACE_ID,
    ownerId: TEST_USER_ID,
  });
  sharing.setSharedWithOrganization(true);
  const context = {
    workspace: aWorkspace(),
    sharing,
    directory,
    rights: { accessLevel: level },
  } as unknown as SharingContext;
  return new ListOwnershipCandidatesUseCase(
    {
      load: jest.fn().mockResolvedValue(context),
    } as unknown as WorkspaceSharingContextService,
    new WorkspaceOwnershipService(
      {} as WorkspaceSharingRepository,
      {} as WorkspacesRepository,
    ),
  );
}

describe(ListOwnershipCandidatesUseCase.name, () => {
  it('lists everyone with access except the owner, with their team', async () => {
    await expect(
      setup('owner').execute({ workspaceId: TEST_WORKSPACE_ID }),
    ).resolves.toEqual([
      { id: lena, name: 'Lena', affiliation: 'Bauamt' },
      { id: sabine, name: 'Sabine', affiliation: null },
    ]);
  });

  it('is only for the owner', async () => {
    await expect(
      setup('full').execute({ workspaceId: TEST_WORKSPACE_ID }),
    ).rejects.toBeInstanceOf(WorkspaceOwnerOnlyError);
  });
});
