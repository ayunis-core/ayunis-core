import {
  TEST_TEAM_ID,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { ResetWorkspaceTeamMemberOverrideCommand } from './reset-workspace-team-member-override.command';
import { ResetWorkspaceTeamMemberOverrideUseCase } from './reset-workspace-team-member-override.use-case';

describe('ResetWorkspaceTeamMemberOverrideUseCase', () => {
  it('removes an override with full workspace access', async () => {
    const repository = { deleteOverride: jest.fn().mockResolvedValue(true) };
    const accessService = {
      requireAccessLevel: jest.fn().mockResolvedValue({}),
    };
    const useCase = new ResetWorkspaceTeamMemberOverrideUseCase(
      { info: jest.fn() } as never,
      repository as never,
      accessService as never,
    );

    await expect(
      useCase.execute(
        new ResetWorkspaceTeamMemberOverrideCommand(
          TEST_WORKSPACE_ID,
          TEST_TEAM_ID,
          TEST_USER_ID,
        ),
      ),
    ).resolves.toBeUndefined();
    expect(accessService.requireAccessLevel).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      WorkspaceAccessLevel.FULL,
    );
  });

  it('rejects a missing override', async () => {
    const useCase = new ResetWorkspaceTeamMemberOverrideUseCase(
      { info: jest.fn() } as never,
      { deleteOverride: jest.fn().mockResolvedValue(false) } as never,
      { requireAccessLevel: jest.fn().mockResolvedValue({}) } as never,
    );

    await expect(
      useCase.execute(
        new ResetWorkspaceTeamMemberOverrideCommand(
          TEST_WORKSPACE_ID,
          TEST_TEAM_ID,
          TEST_USER_ID,
        ),
      ),
    ).rejects.toThrow('Workspace team member override not found');
  });
});
