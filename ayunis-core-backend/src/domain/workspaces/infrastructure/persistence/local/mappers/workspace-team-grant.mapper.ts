import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { WorkspaceTeamGrant } from 'src/domain/workspaces/application/ports/workspace-team-grants-repository.port';
import { WorkspaceTeamGrantRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace-team-grant.record';

@Injectable()
export class WorkspaceTeamGrantMapper {
  toDomain(record: WorkspaceTeamGrantRecord): WorkspaceTeamGrant {
    return {
      workspaceId: record.workspaceId,
      teamId: record.teamId,
      role: record.role,
    };
  }

  toRecord(grant: WorkspaceTeamGrant): WorkspaceTeamGrantRecord {
    const record = new WorkspaceTeamGrantRecord();
    record.id = randomUUID();
    record.workspaceId = grant.workspaceId;
    record.teamId = grant.teamId;
    record.role = grant.role;
    return record;
  }
}
