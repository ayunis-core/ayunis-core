import {
  TEST_TEAM_ID as TEAM_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { WorkspaceTeamGrantMapper } from './workspace-team-grant.mapper';

describe('WorkspaceTeamGrantMapper', () => {
  it('round-trips a workspace team grant', () => {
    const mapper = new WorkspaceTeamGrantMapper();
    const grant = {
      workspaceId: TEST_WORKSPACE_ID,
      teamId: TEAM_ID,
      accessLevel: WorkspaceAccessLevel.EDIT,
    };

    expect(mapper.toDomain(mapper.toRecord(grant))).toEqual(grant);
  });
});
