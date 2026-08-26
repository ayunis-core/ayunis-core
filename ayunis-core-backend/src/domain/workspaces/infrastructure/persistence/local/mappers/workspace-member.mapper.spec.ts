import {
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { WorkspaceMemberMapper } from './workspace-member.mapper';

describe('WorkspaceMemberMapper', () => {
  const mapper = new WorkspaceMemberMapper();

  it('round-trips a workspace member', () => {
    const member = {
      workspaceId: TEST_WORKSPACE_ID,
      userId: TEST_USER_ID,
      accessLevel: WorkspaceAccessLevel.EDIT,
      status: WorkspaceMemberStatus.PENDING,
    };

    expect(mapper.toDomain(mapper.toRecord(member))).toEqual(member);
  });
});
