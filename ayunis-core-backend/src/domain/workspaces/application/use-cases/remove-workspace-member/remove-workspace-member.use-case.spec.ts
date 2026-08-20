import {
  TEST_WORKSPACE_ID,
  aWorkspace,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { RemoveWorkspaceMemberUseCase } from './remove-workspace-member.use-case';

const MEMBER_USER_ID = '44444444-4444-4444-8444-444444444444' as const;

describe('RemoveWorkspaceMemberUseCase', () => {
  it('removes a direct member with full workspace access', async () => {
    const repository = {
      findMember: jest.fn().mockResolvedValue({
        workspaceId: TEST_WORKSPACE_ID,
        userId: MEMBER_USER_ID,
        role: WorkspaceRole.EDIT,
        status: WorkspaceMemberStatus.ACTIVE,
      }),
      deleteMember: jest.fn().mockResolvedValue(undefined),
    };
    const accessService = {
      requireRole: jest.fn().mockResolvedValue({ workspace: aWorkspace() }),
    };
    const useCase = new RemoveWorkspaceMemberUseCase(
      { info: jest.fn() } as never,
      repository as never,
      accessService as never,
    );

    await expect(
      useCase.execute({
        workspaceId: TEST_WORKSPACE_ID,
        userId: MEMBER_USER_ID,
      }),
    ).resolves.toBeUndefined();
  });
});
