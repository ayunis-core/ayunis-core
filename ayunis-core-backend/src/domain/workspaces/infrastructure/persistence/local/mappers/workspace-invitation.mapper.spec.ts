import {
  TEST_USER_ID,
  aWorkspace,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';
import { WorkspaceMemberRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace-member.record';
import { WorkspaceInvitationMapper } from './workspace-invitation.mapper';
import { WorkspaceMapper } from './workspace.mapper';

describe('WorkspaceInvitationMapper', () => {
  it('maps an invitation record and its workspace', () => {
    const workspace = aWorkspace();
    const record = new WorkspaceMemberRecord();
    record.workspace = new WorkspaceMapper().toRecord(workspace);
    record.userId = TEST_USER_ID;
    record.role = WorkspaceRole.EDIT;
    record.status = WorkspaceMemberStatus.PENDING;
    const mapper = new WorkspaceInvitationMapper(new WorkspaceMapper());

    expect(mapper.toView(record)).toEqual({
      workspace,
      role: WorkspaceRole.EDIT,
    });
  });
});
