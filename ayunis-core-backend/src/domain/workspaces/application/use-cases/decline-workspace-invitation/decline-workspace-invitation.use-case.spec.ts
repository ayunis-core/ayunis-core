import {
  TEST_ORG_ID,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
  createMockContextService,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { DeclineWorkspaceInvitationUseCase } from './decline-workspace-invitation.use-case';

describe('DeclineWorkspaceInvitationUseCase', () => {
  it('declines the current user pending invitation', async () => {
    const repository = {
      declineInvitation: jest.fn().mockResolvedValue(true),
    };
    const useCase = new DeclineWorkspaceInvitationUseCase(
      { info: jest.fn() } as never,
      repository as never,
      createMockContextService(),
    );

    await expect(
      useCase.execute({ workspaceId: TEST_WORKSPACE_ID }),
    ).resolves.toBeUndefined();
    expect(repository.declineInvitation).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      TEST_USER_ID,
      TEST_ORG_ID,
    );
  });
});
