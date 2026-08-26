import {
  TEST_TEAM_ID,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { GetWorkspaceSharingQuery } from './get-workspace-sharing.query';
import { GetWorkspaceSharingUseCase } from './get-workspace-sharing.use-case';

const GRANT_ID = '55555555-5555-4555-8555-555555555555' as const;

describe('GetWorkspaceSharingUseCase', () => {
  it('hydrates direct members, team grants and overrides', async () => {
    const repository = {
      findSharing: jest.fn().mockResolvedValue({
        members: [
          {
            workspaceId: TEST_WORKSPACE_ID,
            userId: TEST_USER_ID,
            accessLevel: WorkspaceAccessLevel.EDIT,
            status: WorkspaceMemberStatus.ACTIVE,
          },
        ],
        teamGrants: [
          {
            id: GRANT_ID,
            workspaceId: TEST_WORKSPACE_ID,
            teamId: TEST_TEAM_ID,
            accessLevel: WorkspaceAccessLevel.USE,
            overrides: [
              {
                teamGrantId: GRANT_ID,
                userId: TEST_USER_ID,
                accessLevel: null,
                excluded: true,
              },
            ],
          },
        ],
      }),
    };
    const accessService = {
      requireAccessLevel: jest.fn().mockResolvedValue({}),
    };
    const findUsers = {
      execute: jest.fn().mockResolvedValue([{ id: TEST_USER_ID, name: 'Ada' }]),
    };
    const listTeams = {
      execute: jest
        .fn()
        .mockResolvedValue([
          { team: { id: TEST_TEAM_ID, name: 'Service' }, memberCount: 2 },
        ]),
    };
    const useCase = new GetWorkspaceSharingUseCase(
      { info: jest.fn() } as never,
      repository,
      accessService as never,
      findUsers as never,
      listTeams as never,
    );

    await expect(
      useCase.execute(new GetWorkspaceSharingQuery(TEST_WORKSPACE_ID)),
    ).resolves.toEqual({
      members: [
        {
          user: { id: TEST_USER_ID, name: 'Ada' },
          accessLevel: WorkspaceAccessLevel.EDIT,
          status: WorkspaceMemberStatus.ACTIVE,
        },
      ],
      teamGrants: [
        {
          team: { id: TEST_TEAM_ID, name: 'Service' },
          memberCount: 2,
          accessLevel: WorkspaceAccessLevel.USE,
          overrides: [
            {
              user: { id: TEST_USER_ID, name: 'Ada' },
              accessLevel: null,
              excluded: true,
            },
          ],
        },
      ],
    });
    expect(accessService.requireAccessLevel).toHaveBeenCalledWith(
      TEST_WORKSPACE_ID,
      WorkspaceAccessLevel.FULL,
    );
  });
});
