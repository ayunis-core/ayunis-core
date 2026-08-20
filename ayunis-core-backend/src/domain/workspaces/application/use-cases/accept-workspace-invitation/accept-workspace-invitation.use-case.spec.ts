import {
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
  createMockContextService,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { AcceptWorkspaceInvitationUseCase } from './accept-workspace-invitation.use-case';

const member = {
  workspaceId: TEST_WORKSPACE_ID,
  userId: TEST_USER_ID,
  role: WorkspaceRole.EDIT,
  status: WorkspaceMemberStatus.ACTIVE,
};

describe('AcceptWorkspaceInvitationUseCase', () => {
  it('accepts the current user pending invitation', async () => {
    const repository = {
      activateInvitation: jest.fn().mockResolvedValue(member),
    };
    const useCase = new AcceptWorkspaceInvitationUseCase(
      { info: jest.fn() } as never,
      repository as never,
      createMockContextService(),
    );

    await expect(
      useCase.execute({ workspaceId: TEST_WORKSPACE_ID }),
    ).resolves.toEqual(member);
  });
});
