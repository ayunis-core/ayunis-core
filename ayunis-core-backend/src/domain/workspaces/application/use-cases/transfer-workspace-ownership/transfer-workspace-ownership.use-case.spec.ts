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
import { OrgDirectory } from 'src/domain/workspaces/application/models/org-directory';
import type { WorkspaceSharingRepository } from 'src/domain/workspaces/application/ports/workspace-sharing.repository';
import type { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { WorkspaceOwnershipService } from 'src/domain/workspaces/application/services/workspace-ownership.service';
import type {
  SharingContext,
  WorkspaceSharingContextService,
} from 'src/domain/workspaces/application/services/workspace-sharing-context.service';
import type { WorkspaceSummaryService } from 'src/domain/workspaces/application/services/workspace-summary.service';
import {
  aWorkspace,
  createMockWorkspaceAccessService,
  createMockWorkspacesRepository,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import {
  WorkspaceNotFoundError,
  WorkspaceOwnerOnlyError,
  WorkspaceTransferTargetNotEligibleError,
} from 'src/domain/workspaces/application/workspaces.errors';
import type { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/workspace-access-level';
import { WorkspaceSharing } from 'src/domain/workspaces/domain/workspace-sharing';
import { TransferWorkspaceOwnershipCommand } from './transfer-workspace-ownership.command';
import { TransferWorkspaceOwnershipUseCase } from './transfer-workspace-ownership.use-case';

const lena = randomUUID();
const jonas = randomUUID();
const sabine = randomUUID();
const bauamt = randomUUID();

const directory = new OrgDirectory(
  [
    { id: TEST_USER_ID, name: 'Tobias', teams: [] },
    { id: lena, name: 'Lena', teams: [{ id: bauamt, name: 'Bauamt' }] },
    { id: jonas, name: 'Jonas', teams: [{ id: bauamt, name: 'Bauamt' }] },
    { id: sabine, name: 'Sabine', teams: [] },
  ],
  [{ id: bauamt, name: 'Bauamt' }],
);

function setup(callerLevel: WorkspaceAccessLevel = 'owner') {
  const workspace = aWorkspace();
  const sharing = new WorkspaceSharing({
    workspaceId: workspace.id,
    ownerId: TEST_USER_ID,
  });
  sharing.invite(
    { userIds: [], teamIds: [bauamt], level: 'use', at: new Date() },
    directory,
  );
  sharing.remove(jonas, { type: 'team', teamId: bauamt }, directory);
  const repository = createMockWorkspacesRepository();
  const sharingRepository = { save: jest.fn().mockResolvedValue(undefined) };
  const context = {
    workspace,
    sharing,
    directory,
    rights: { accessLevel: callerLevel },
  } as unknown as SharingContext;
  const sharingContext = {
    loadForChange: jest.fn().mockResolvedValue(context),
  };
  const access = createMockWorkspaceAccessService(workspace, 'full');
  const summaries = {
    detail: jest
      .fn()
      .mockImplementation(({ level }) =>
        Promise.resolve({ workspace, accessLevel: level, memberCount: 3 }),
      ),
  };
  const useCase = new TransferWorkspaceOwnershipUseCase(
    sharingContext as unknown as WorkspaceSharingContextService,
    new WorkspaceOwnershipService(
      sharingRepository as unknown as WorkspaceSharingRepository,
      repository,
    ),
    access as unknown as WorkspaceAccessService,
    summaries as unknown as WorkspaceSummaryService,
  );
  return { useCase, repository, sharing, sharingRepository, sharingContext };
}

function transferTo(useCase: TransferWorkspaceOwnershipUseCase, userId: UUID) {
  return useCase.execute(
    new TransferWorkspaceOwnershipCommand(TEST_WORKSPACE_ID, userId),
  );
}

describe(TransferWorkspaceOwnershipUseCase.name, () => {
  it('hands the workspace to a member and answers with the caller’s new level', async () => {
    const { useCase, repository, sharing, sharingRepository, sharingContext } =
      setup();

    const detail = await transferTo(useCase, lena);

    expect(sharingContext.loadForChange).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
    );
    expect(repository.changeOwner).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      lena,
    );
    expect(sharing.ownerId).toBe(lena);
    expect(sharing.levelOf(TEST_USER_ID, [])).toBe('full');
    expect(sharingRepository.save).toHaveBeenCalledWith(sharing);
    expect(detail.accessLevel).toBe('full');
  });

  it.each<WorkspaceAccessLevel>(['full', 'edit', 'use'])(
    'refuses members with %s access',
    async (level) => {
      const { useCase, sharing, sharingRepository } = setup(level);

      await expect(transferTo(useCase, lena)).rejects.toBeInstanceOf(
        WorkspaceOwnerOnlyError,
      );
      expect(sharing.ownerId).toBe(TEST_USER_ID);
      expect(sharingRepository.save).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['someone without access', sabine],
    ['someone taken out of the team', jonas],
    ['someone outside the organisation', randomUUID()],
    ['the owner', TEST_USER_ID],
  ])('refuses %s as new owner', async (_label, userId) => {
    const { useCase, sharing, sharingRepository } = setup();

    await expect(transferTo(useCase, userId)).rejects.toBeInstanceOf(
      WorkspaceTransferTargetNotEligibleError,
    );
    expect(sharing.ownerId).toBe(TEST_USER_ID);
    expect(sharingRepository.save).not.toHaveBeenCalled();
  });

  it('keeps the not-found answer for people without access', async () => {
    const { useCase, sharingContext } = setup();
    sharingContext.loadForChange.mockRejectedValue(
      new WorkspaceNotFoundError(TEST_WORKSPACE_ID),
    );

    await expect(transferTo(useCase, lena)).rejects.toBeInstanceOf(
      WorkspaceNotFoundError,
    );
  });
});
