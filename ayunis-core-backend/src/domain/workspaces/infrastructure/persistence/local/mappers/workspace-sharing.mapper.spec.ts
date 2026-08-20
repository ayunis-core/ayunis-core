import {
  TEST_TEAM_ID,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { WorkspaceMemberMapper } from './workspace-member.mapper';
import { WorkspaceSharingMapper } from './workspace-sharing.mapper';
import { WorkspaceTeamGrantMapper } from './workspace-team-grant.mapper';
import { WorkspaceTeamMemberOverrideMapper } from './workspace-team-member-override.mapper';

const GRANT_ID = '55555555-5555-4555-8555-555555555555' as const;

describe('WorkspaceSharingMapper', () => {
  it('maps sharing records into a grouped snapshot', () => {
    const mapper = new WorkspaceSharingMapper(
      new WorkspaceMemberMapper(),
      new WorkspaceTeamGrantMapper(),
      new WorkspaceTeamMemberOverrideMapper(),
    );
    const member = new WorkspaceMemberMapper().toRecord({
      workspaceId: TEST_WORKSPACE_ID,
      userId: TEST_USER_ID,
      accessLevel: WorkspaceAccessLevel.EDIT,
      status: WorkspaceMemberStatus.ACTIVE,
    });
    const grant = new WorkspaceTeamGrantMapper().toRecord({
      workspaceId: TEST_WORKSPACE_ID,
      teamId: TEST_TEAM_ID,
      accessLevel: WorkspaceAccessLevel.USE,
    });
    grant.id = GRANT_ID;
    const override = new WorkspaceTeamMemberOverrideMapper().toRecord({
      teamGrantId: GRANT_ID,
      userId: TEST_USER_ID,
      accessLevel: null,
      excluded: true,
    });

    expect(mapper.toSnapshot([member], [grant], [override])).toEqual({
      members: [expect.objectContaining({ userId: TEST_USER_ID })],
      teamGrants: [
        expect.objectContaining({
          id: GRANT_ID,
          teamId: TEST_TEAM_ID,
          overrides: [expect.objectContaining({ excluded: true })],
        }),
      ],
    });
  });
});
