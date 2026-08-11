import { Injectable } from '@nestjs/common';
import { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import { WorkspaceRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace.record';

@Injectable()
export class WorkspaceMapper {
  toDomain(record: WorkspaceRecord): Workspace {
    return new Workspace({
      id: record.id,
      userId: record.userId,
      orgId: record.orgId,
      name: record.name,
      description: record.description,
      icon: record.icon,
      color: record.color,
      isPinned: record.isPinned,
      sortOrder: record.sortOrder,
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
    record.isPinned = domain.isPinned;
    record.sortOrder = domain.sortOrder;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
