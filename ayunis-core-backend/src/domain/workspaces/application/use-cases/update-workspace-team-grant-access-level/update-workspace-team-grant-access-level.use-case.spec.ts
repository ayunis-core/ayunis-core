import {
  TEST_TEAM_ID as TEAM_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { UpdateWorkspaceTeamGrantAccessLevelCommand } from './update-workspace-team-grant-access-level.command';
import { UpdateWorkspaceTeamGrantAccessLevelUseCase } from './update-workspace-team-grant-access-level.use-case';

describe('UpdateWorkspaceTeamGrantAccessLevelUseCase', () => {
  it('updates a team grant access level with full workspace access', async () => {
    const repository = {
      updateGrantAccessLevel: jest.fn().mockResolvedValue({
        workspaceId: TEST_WORKSPACE_ID,
        teamId: TEAM_ID,
        accessLevel: WorkspaceAccessLevel.FULL,
      }),
    };
    const accessService = {
      requireAccessLevel: jest.fn().mockResolvedValue({}),
    };
    const useCase = new UpdateWorkspaceTeamGrantAccessLevelUseCase(
      { info: jest.fn() } as never,
      repository as never,
      accessService as never,
    );

    await expect(
      useCase.execute(
        new UpdateWorkspaceTeamGrantAccessLevelCommand(
          TEST_WORKSPACE_ID,
          TEAM_ID,
          WorkspaceAccessLevel.FULL,
        ),
      ),
    ).resolves.toEqual({
      workspaceId: TEST_WORKSPACE_ID,
      teamId: TEAM_ID,
      accessLevel: WorkspaceAccessLevel.FULL,
    });
    expect(accessService.requireAccessLevel).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      WorkspaceAccessLevel.FULL,
    );
  });

  it('rejects a missing team grant', async () => {
    const useCase = new UpdateWorkspaceTeamGrantAccessLevelUseCase(
      { info: jest.fn() } as never,
      { updateGrantAccessLevel: jest.fn().mockResolvedValue(null) } as never,
      { requireAccessLevel: jest.fn().mockResolvedValue({}) } as never,
    );

    await expect(
      useCase.execute(
        new UpdateWorkspaceTeamGrantAccessLevelCommand(
          TEST_WORKSPACE_ID,
          TEAM_ID,
          WorkspaceAccessLevel.EDIT,
        ),
      ),
    ).rejects.toThrow('Workspace team grant not found');
  });
});
