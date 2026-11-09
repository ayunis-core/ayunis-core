import { Injectable } from '@nestjs/common';
import { WorkspaceMember } from 'src/domain/workspaces/domain/workspace-member.entity';
import { WorkspaceMemberRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace-member.record';

@Injectable()
export class WorkspaceMemberMapper {
  toDomain(record: WorkspaceMemberRecord): WorkspaceMember {
    return new WorkspaceMember({
      id: record.id,
      workspaceId: record.workspaceId,
      userId: record.userId,
      role: record.role,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(domain: WorkspaceMember): WorkspaceMemberRecord {
    const record = new WorkspaceMemberRecord();
    record.id = domain.id;
    record.workspaceId = domain.workspaceId;
    record.userId = domain.userId;
    record.role = domain.role;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
