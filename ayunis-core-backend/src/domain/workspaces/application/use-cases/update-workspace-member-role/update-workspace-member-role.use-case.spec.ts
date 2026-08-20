import {
  TEST_WORKSPACE_ID,
  aWorkspace,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { UpdateWorkspaceMemberRoleUseCase } from './update-workspace-member-role.use-case';

const MEMBER_USER_ID = '44444444-4444-4444-8444-444444444444' as const;

describe('UpdateWorkspaceMemberRoleUseCase', () => {
  it('updates an active direct member role with full workspace access', async () => {
    const repository = {
      updateMemberRole: jest.fn().mockResolvedValue({
        workspaceId: TEST_WORKSPACE_ID,
        userId: MEMBER_USER_ID,
        role: WorkspaceRole.FULL,
        status: WorkspaceMemberStatus.ACTIVE,
      }),
    };
    const accessService = {
      requireRole: jest.fn().mockResolvedValue({ workspace: aWorkspace() }),
    };
    const useCase = new UpdateWorkspaceMemberRoleUseCase(
      { info: jest.fn() } as never,
      repository as never,
      accessService as never,
    );

    await expect(
      useCase.execute({
        workspaceId: TEST_WORKSPACE_ID,
        userId: MEMBER_USER_ID,
        role: WorkspaceRole.FULL,
      }),
    ).resolves.toMatchObject({ role: WorkspaceRole.FULL });
  });
});
