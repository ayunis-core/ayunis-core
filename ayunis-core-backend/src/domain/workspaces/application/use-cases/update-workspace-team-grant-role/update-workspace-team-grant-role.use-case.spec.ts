import {
  TEST_TEAM_ID as TEAM_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { UpdateWorkspaceTeamGrantRoleCommand } from './update-workspace-team-grant-role.command';
import { UpdateWorkspaceTeamGrantRoleUseCase } from './update-workspace-team-grant-role.use-case';

describe('UpdateWorkspaceTeamGrantRoleUseCase', () => {
  it('updates a team grant role with full workspace access', async () => {
    const repository = {
      updateGrantRole: jest.fn().mockResolvedValue({
        workspaceId: TEST_WORKSPACE_ID,
        teamId: TEAM_ID,
        role: WorkspaceRole.FULL,
      }),
    };
    const accessService = { requireRole: jest.fn().mockResolvedValue({}) };
    const useCase = new UpdateWorkspaceTeamGrantRoleUseCase(
      { info: jest.fn() } as never,
      repository as never,
      accessService as never,
    );

    await expect(
      useCase.execute(
        new UpdateWorkspaceTeamGrantRoleCommand(
          TEST_WORKSPACE_ID,
          TEAM_ID,
          WorkspaceRole.FULL,
        ),
      ),
    ).resolves.toEqual({
      workspaceId: TEST_WORKSPACE_ID,
      teamId: TEAM_ID,
      role: WorkspaceRole.FULL,
    });
    expect(accessService.requireRole).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      WorkspaceRole.FULL,
    );
  });

  it('rejects a missing team grant', async () => {
    const useCase = new UpdateWorkspaceTeamGrantRoleUseCase(
      { info: jest.fn() } as never,
      { updateGrantRole: jest.fn().mockResolvedValue(null) } as never,
      { requireRole: jest.fn().mockResolvedValue({}) } as never,
    );

    await expect(
      useCase.execute(
        new UpdateWorkspaceTeamGrantRoleCommand(
          TEST_WORKSPACE_ID,
          TEAM_ID,
          WorkspaceRole.EDIT,
        ),
      ),
    ).rejects.toThrow('Workspace team grant not found');
  });
});
