import {
  TEST_TEAM_ID,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { ListWorkspaceTeamMembersQuery } from './list-workspace-team-members.query';
import { ListWorkspaceTeamMembersUseCase } from './list-workspace-team-members.use-case';

describe('ListWorkspaceTeamMembersUseCase', () => {
  it('hydrates members of a granted team with full access', async () => {
    const repository = {
      findSharing: jest.fn().mockResolvedValue({
        members: [],
        teamGrants: [{ teamId: TEST_TEAM_ID }],
      }),
    };
    const accessService = {
      requireAccessLevel: jest.fn().mockResolvedValue({}),
    };
    const findUserIds = {
      execute: jest.fn().mockResolvedValue([TEST_USER_ID]),
    };
    const users = [{ id: TEST_USER_ID, name: 'Ada' }];
    const findUsers = { execute: jest.fn().mockResolvedValue(users) };
    const useCase = new ListWorkspaceTeamMembersUseCase(
      { info: jest.fn() } as never,
      repository as never,
      accessService as never,
      findUserIds as never,
      findUsers as never,
    );

    await expect(
      useCase.execute(
        new ListWorkspaceTeamMembersQuery(TEST_WORKSPACE_ID, TEST_TEAM_ID),
      ),
    ).resolves.toEqual(users);
    expect(accessService.requireAccessLevel).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      WorkspaceAccessLevel.FULL,
    );
  });
});
