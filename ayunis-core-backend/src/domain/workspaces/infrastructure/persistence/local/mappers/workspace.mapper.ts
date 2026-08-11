import { Injectable } from '@nestjs/common';
import { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { WorkspaceRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace.record';
import type { WorkspaceUserSettingsRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace-user-settings.record';

@Injectable()
export class WorkspaceMapper {
  /**
   * Pin state and manual order live on the caller's settings row, not on the
   * workspace itself; a missing row means the defaults.
   */
  toDomain(
    record: WorkspaceRecord,
    settings?: WorkspaceUserSettingsRecord | null,
  ): Workspace {
    return new Workspace({
      id: record.id,
      userId: record.userId,
      orgId: record.orgId,
      name: record.name,
      description: record.description,
      icon: record.icon,
      color: record.color,
      isPinned: settings?.isPinned ?? false,
      sortOrder: settings?.sortOrder ?? 0,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(domain: Workspace): WorkspaceRecord {
    const record = new WorkspaceRecord();
    record.id = domain.id;
    record.userId = domain.userId;
    record.orgId = domain.orgId;
    record.name = domain.name;
    record.description = domain.description;
    record.icon = domain.icon;
    record.color = domain.color;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
