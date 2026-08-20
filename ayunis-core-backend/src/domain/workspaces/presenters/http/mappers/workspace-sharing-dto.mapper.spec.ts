import {
  TEST_TEAM_ID,
  TEST_USER_ID,
  aWorkspace,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
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
            role: WorkspaceRole.EDIT,
            status: WorkspaceMemberStatus.ACTIVE,
          },
        ],
        teamGrants: [
          {
            team: { id: TEST_TEAM_ID, name: 'Service' } as never,
            memberCount: 2,
            role: WorkspaceRole.USE,
            overrides: [{ user: user as never, role: null, excluded: true }],
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
          role: WorkspaceRole.EDIT,
          status: WorkspaceMemberStatus.ACTIVE,
        },
      ],
      teamGrants: [
        {
          id: TEST_TEAM_ID,
          name: 'Service',
          memberCount: 2,
          role: WorkspaceRole.USE,
          overrides: [
            {
              user: { id: TEST_USER_ID, name: 'Ada', email: 'ada@example.org' },
              role: null,
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
      mapper.toInvitationDto({ workspace, role: WorkspaceRole.USE }),
    ).toEqual({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        icon: workspace.icon,
        color: workspace.color,
      },
      role: WorkspaceRole.USE,
    });
  });
});
