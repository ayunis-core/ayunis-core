import type { ContextService } from 'src/common/context/services/context.service';
import {
  TEST_ORG_ID,
  TEST_USER_ID,
  aWorkspace,
  createMockContextService,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { ListMyWorkspaceInvitationsUseCase } from './list-my-workspace-invitations.use-case';

describe('ListMyWorkspaceInvitationsUseCase', () => {
  it('lists pending invitations for the current user and organization', async () => {
    const invitations = [{ workspace: aWorkspace(), role: WorkspaceRole.EDIT }];
    const repository = {
      findPendingByUser: jest.fn().mockResolvedValue(invitations),
    };
    const useCase = new ListMyWorkspaceInvitationsUseCase(
      { info: jest.fn() } as never,
      repository,
      createMockContextService(),
    );

    await expect(useCase.execute()).resolves.toEqual(invitations);
    expect(repository.findPendingByUser).toHaveBeenCalledWith(
      TEST_USER_ID,
      TEST_ORG_ID,
    );
  });

  it('rejects requests without an authenticated user', async () => {
    const useCase = new ListMyWorkspaceInvitationsUseCase(
      { info: jest.fn() } as never,
      {} as never,
      { get: jest.fn() } as unknown as ContextService,
    );

    await expect(useCase.execute()).rejects.toThrow('Unauthorized');
  });
});
