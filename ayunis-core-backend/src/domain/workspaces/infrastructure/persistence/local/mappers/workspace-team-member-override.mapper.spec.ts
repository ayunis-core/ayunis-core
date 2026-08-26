import {
  TEST_TEAM_ID,
  TEST_USER_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { WorkspaceTeamMemberOverrideMapper } from './workspace-team-member-override.mapper';

describe('WorkspaceTeamMemberOverrideMapper', () => {
  it('round-trips a workspace team member override', () => {
    const mapper = new WorkspaceTeamMemberOverrideMapper();
    const override = {
      teamGrantId: TEST_TEAM_ID,
      userId: TEST_USER_ID,
      accessLevel: WorkspaceAccessLevel.EDIT,
      excluded: false,
    };

    expect(mapper.toDomain(mapper.toRecord(override))).toEqual(override);
  });
});
