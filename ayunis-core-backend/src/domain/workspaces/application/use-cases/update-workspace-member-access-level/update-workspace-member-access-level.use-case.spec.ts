import {
  TEST_WORKSPACE_ID,
  aWorkspace,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { UpdateWorkspaceMemberAccessLevelUseCase } from './update-workspace-member-access-level.use-case';

const MEMBER_USER_ID = '44444444-4444-4444-8444-444444444444' as const;

describe('UpdateWorkspaceMemberAccessLevelUseCase', () => {
  it('updates an active direct member access level with full workspace access', async () => {
    const repository = {
      updateMemberAccessLevel: jest.fn().mockResolvedValue({
        workspaceId: TEST_WORKSPACE_ID,
        userId: MEMBER_USER_ID,
        accessLevel: WorkspaceAccessLevel.FULL,
        status: WorkspaceMemberStatus.ACTIVE,
      }),
    };
    const accessService = {
      requireAccessLevel: jest
        .fn()
        .mockResolvedValue({ workspace: aWorkspace() }),
    };
    const useCase = new UpdateWorkspaceMemberAccessLevelUseCase(
      { info: jest.fn() } as never,
      repository as never,
      accessService as never,
    );

    await expect(
      useCase.execute({
        workspaceId: TEST_WORKSPACE_ID,
        userId: MEMBER_USER_ID,
        accessLevel: WorkspaceAccessLevel.FULL,
      }),
    ).resolves.toMatchObject({ accessLevel: WorkspaceAccessLevel.FULL });
  });
});
