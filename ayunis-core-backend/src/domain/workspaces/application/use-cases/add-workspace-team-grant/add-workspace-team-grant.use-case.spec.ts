import {
  TEST_TEAM_ID as TEAM_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { AddWorkspaceTeamGrantCommand } from './add-workspace-team-grant.command';
import { AddWorkspaceTeamGrantUseCase } from './add-workspace-team-grant.use-case';

describe('AddWorkspaceTeamGrantUseCase', () => {
  it('grants a team access after validating full access and organization scope', async () => {
    const repository = {
      createGrant: jest.fn().mockImplementation((grant) => grant),
    };
    const accessService = {
      requireAccessLevel: jest.fn().mockResolvedValue({}),
    };
    const getTeamUseCase = {
      execute: jest.fn().mockResolvedValue({ id: TEAM_ID }),
    };
    const useCase = new AddWorkspaceTeamGrantUseCase(
      { info: jest.fn() } as never,
      repository as never,
      accessService as never,
      getTeamUseCase as never,
    );

    await expect(
      useCase.execute(
        new AddWorkspaceTeamGrantCommand(
          TEST_WORKSPACE_ID,
          TEAM_ID,
          WorkspaceAccessLevel.EDIT,
        ),
      ),
    ).resolves.toEqual({
      workspaceId: TEST_WORKSPACE_ID,
      teamId: TEAM_ID,
      accessLevel: WorkspaceAccessLevel.EDIT,
    });
    expect(accessService.requireAccessLevel).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      WorkspaceAccessLevel.FULL,
    );
    expect(getTeamUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: TEAM_ID }),
    );
  });

  it('rejects a duplicate team grant', async () => {
    const useCase = new AddWorkspaceTeamGrantUseCase(
      { info: jest.fn() } as never,
      { createGrant: jest.fn().mockResolvedValue(null) } as never,
      { requireAccessLevel: jest.fn().mockResolvedValue({}) } as never,
      { execute: jest.fn().mockResolvedValue({ id: TEAM_ID }) } as never,
    );

    await expect(
      useCase.execute(
        new AddWorkspaceTeamGrantCommand(
          TEST_WORKSPACE_ID,
          TEAM_ID,
          WorkspaceAccessLevel.USE,
        ),
      ),
    ).rejects.toThrow('already has access to the workspace');
  });
});
