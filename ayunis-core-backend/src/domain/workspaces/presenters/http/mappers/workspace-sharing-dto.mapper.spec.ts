import {
  TEST_TEAM_ID,
  TEST_USER_ID,
  aWorkspace,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { WorkspaceVisibility } from 'src/domain/workspaces/domain/value-objects/workspace-visibility.enum';
import { WorkspaceSharingDtoMapper } from './workspace-sharing-dto.mapper';

describe('WorkspaceSharingDtoMapper', () => {
  const mapper = new WorkspaceSharingDtoMapper();

  it('exposes only sharing-safe user and team fields', () => {
    const user = {
      id: TEST_USER_ID,
      name: 'Ada',
      email: 'ada@example.org',
      passwordHash: 'secret',
    };

    expect(
      mapper.toSharingDto({
        visibility: WorkspaceVisibility.PRIVATE,
        owner: user as never,
        availableTeams: [
          {
            team: { id: TEST_TEAM_ID, name: 'Service' } as never,
            memberCount: 2,
          },
        ],
        members: [
          {
            user: user as never,
            accessLevel: WorkspaceAccessLevel.EDIT,
            status: WorkspaceMemberStatus.ACTIVE,
          },
        ],
        teamGrants: [
          {
            team: { id: TEST_TEAM_ID, name: 'Service' } as never,
            memberCount: 2,
            accessLevel: WorkspaceAccessLevel.USE,
            overrides: [
              { user: user as never, accessLevel: null, excluded: true },
            ],
          },
        ],
      }),
    ).toEqual({
      visibility: WorkspaceVisibility.PRIVATE,
      owner: { id: TEST_USER_ID, name: 'Ada', email: 'ada@example.org' },
      availableTeams: [{ id: TEST_TEAM_ID, name: 'Service', memberCount: 2 }],
      members: [
        {
          user: { id: TEST_USER_ID, name: 'Ada', email: 'ada@example.org' },
          accessLevel: WorkspaceAccessLevel.EDIT,
          status: WorkspaceMemberStatus.ACTIVE,
        },
      ],
      teamGrants: [
        {
          id: TEST_TEAM_ID,
          name: 'Service',
          memberCount: 2,
          accessLevel: WorkspaceAccessLevel.USE,
          overrides: [
            {
              user: { id: TEST_USER_ID, name: 'Ada', email: 'ada@example.org' },
              accessLevel: null,
              excluded: true,
            },
          ],
        },
      ],
    });
  });

  it('maps pending invitations', () => {
    const workspace = aWorkspace();

    expect(
      mapper.toInvitationDto({
        workspace,
        accessLevel: WorkspaceAccessLevel.USE,
      }),
    ).toEqual({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        icon: workspace.icon,
        color: workspace.color,
      },
      accessLevel: WorkspaceAccessLevel.USE,
    });
  });
});
