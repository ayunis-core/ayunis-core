import { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { WorkspaceRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace.record';
import { WorkspaceUserSettingsRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace-user-settings.record';
import { WorkspaceMapper } from './workspace.mapper';
import {
  aWorkspace,
  TEST_ORG_ID,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';

describe('WorkspaceMapper', () => {
  const mapper = new WorkspaceMapper();

  function settingsRow(
    overrides: Partial<WorkspaceUserSettingsRecord> = {},
  ): WorkspaceUserSettingsRecord {
    const row = new WorkspaceUserSettingsRecord();
    row.workspaceId = TEST_WORKSPACE_ID;
    row.userId = TEST_USER_ID;
    row.isPinned = true;
    row.sortOrder = 7;
    Object.assign(row, overrides);
    return row;
  }

  it('round-trips the core fields', () => {
    const workspace = aWorkspace({
      name: 'Feuerwehr',
      description: 'Einsätze',
      icon: 'flame',
      color: '#6b5bd6',
      isPinned: true,
      sortOrder: 7,
    });

    const roundTripped = mapper.toDomain(
      mapper.toRecord(workspace),
      settingsRow(),
    );

    expect(roundTripped).toEqual(workspace);
  });

  it('hydrates pin state and order from the settings row', () => {
    const record = mapper.toRecord(aWorkspace());

    const workspace = mapper.toDomain(
      record,
      settingsRow({ isPinned: true, sortOrder: 3 }),
    );

    expect(workspace.isPinned).toBe(true);
    expect(workspace.sortOrder).toBe(3);
  });

  it('defaults to unpinned and unordered without a settings row', () => {
    const workspace = mapper.toDomain(mapper.toRecord(aWorkspace()), null);

    expect(workspace.isPinned).toBe(false);
    expect(workspace.sortOrder).toBe(0);
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
