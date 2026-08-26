import type { UUID } from 'crypto';
import {
  TEST_TEAM_ID,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { WorkspaceVisibility } from 'src/domain/workspaces/domain/value-objects/workspace-visibility.enum';
import { GetWorkspaceSharingQuery } from './get-workspace-sharing.query';
import { GetWorkspaceSharingUseCase } from './get-workspace-sharing.use-case';

const GRANT_ID = '55555555-5555-4555-8555-555555555555' as const;
const OWNER_ID = '66666666-6666-4666-8666-666666666666' as UUID;
const AVAILABLE_TEAM_ID = '77777777-7777-4777-8777-777777777777' as UUID;

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
      requireAccessLevel: jest.fn().mockResolvedValue({
        workspace: {
          userId: OWNER_ID,
          visibility: WorkspaceVisibility.ORGANIZATION,
        },
      }),
    };
    const findUsers = {
      execute: jest.fn().mockResolvedValue([
        { id: OWNER_ID, name: 'Owner' },
        { id: TEST_USER_ID, name: 'Ada' },
      ]),
    };
    const listTeams = {
      execute: jest.fn().mockResolvedValue([
        { team: { id: TEST_TEAM_ID, name: 'Service' }, memberCount: 2 },
        {
          team: { id: AVAILABLE_TEAM_ID, name: 'Planning' },
          memberCount: 3,
        },
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
      visibility: WorkspaceVisibility.ORGANIZATION,
      owner: { id: OWNER_ID, name: 'Owner' },
      availableTeams: [
        {
          team: { id: AVAILABLE_TEAM_ID, name: 'Planning' },
          memberCount: 3,
        },
      ],
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
