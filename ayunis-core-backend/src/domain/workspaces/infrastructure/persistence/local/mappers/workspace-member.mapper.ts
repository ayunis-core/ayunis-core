import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { WorkspaceMember } from 'src/domain/workspaces/application/ports/workspace-members-repository.port';
import { WorkspaceMemberRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace-member.record';

@Injectable()
export class WorkspaceMemberMapper {
  toDomain(record: WorkspaceMemberRecord): WorkspaceMember {
    return {
      workspaceId: record.workspaceId,
      userId: record.userId,
      accessLevel: record.accessLevel,
      status: record.status,
    };
  }

  toRecord(member: WorkspaceMember): WorkspaceMemberRecord {
    const record = new WorkspaceMemberRecord();
    record.id = randomUUID();
    record.workspaceId = member.workspaceId;
    record.userId = member.userId;
    record.accessLevel = member.accessLevel;
    record.status = member.status;
    return record;
  }
}
