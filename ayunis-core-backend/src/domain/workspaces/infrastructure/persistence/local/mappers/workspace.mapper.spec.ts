import { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { WorkspaceRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace.record';
import { WorkspaceMapper } from './workspace.mapper';
import {
  aWorkspace,
  TEST_ORG_ID,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';

describe('WorkspaceMapper', () => {
  const mapper = new WorkspaceMapper();

  it('round-trips the core fields', () => {
    const workspace = aWorkspace({
      name: 'Feuerwehr',
      description: 'Einsätze',
      icon: 'flame',
      color: '#6b5bd6',
    });

    const roundTripped = mapper.toDomain(mapper.toRecord(workspace));

    expect(roundTripped).toEqual(workspace);
  });

  it('maps a record to the domain entity', () => {
    const record = new WorkspaceRecord();
    record.id = TEST_WORKSPACE_ID;
    record.userId = TEST_USER_ID;
    record.orgId = TEST_ORG_ID;
    record.name = 'Gebühren';
    record.description = null;
    record.icon = 'receipt';
    record.color = 'amber';
    record.createdAt = new Date('2026-08-01T10:00:00.000Z');
    record.updatedAt = new Date('2026-08-02T10:00:00.000Z');

    const workspace = mapper.toDomain(record);

    expect(workspace).toBeInstanceOf(Workspace);
    expect(workspace.name).toBe('Gebühren');
    expect(workspace.description).toBeNull();
    expect(workspace.icon).toBe('receipt');
    expect(workspace.color).toBe('amber');
  });
});
