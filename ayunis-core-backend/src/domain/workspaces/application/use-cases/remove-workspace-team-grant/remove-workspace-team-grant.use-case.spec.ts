import {
  TEST_TEAM_ID as TEAM_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { RemoveWorkspaceTeamGrantCommand } from './remove-workspace-team-grant.command';
import { RemoveWorkspaceTeamGrantUseCase } from './remove-workspace-team-grant.use-case';

describe('RemoveWorkspaceTeamGrantUseCase', () => {
  it('removes a team grant with full workspace access', async () => {
    const repository = { deleteGrant: jest.fn().mockResolvedValue(true) };
    const accessService = { requireRole: jest.fn().mockResolvedValue({}) };
    const useCase = new RemoveWorkspaceTeamGrantUseCase(
      { info: jest.fn() } as never,
      repository as never,
      accessService as never,
    );

    await expect(
      useCase.execute(
        new RemoveWorkspaceTeamGrantCommand(TEST_WORKSPACE_ID, TEAM_ID),
      ),
    ).resolves.toBeUndefined();
    expect(accessService.requireRole).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      WorkspaceRole.FULL,
    );
  });

  it('rejects a missing team grant', async () => {
    const useCase = new RemoveWorkspaceTeamGrantUseCase(
      { info: jest.fn() } as never,
      { deleteGrant: jest.fn().mockResolvedValue(false) } as never,
      { requireRole: jest.fn().mockResolvedValue({}) } as never,
    );

    await expect(
      useCase.execute(
        new RemoveWorkspaceTeamGrantCommand(TEST_WORKSPACE_ID, TEAM_ID),
      ),
    ).rejects.toThrow('Workspace team grant not found');
  });
});
