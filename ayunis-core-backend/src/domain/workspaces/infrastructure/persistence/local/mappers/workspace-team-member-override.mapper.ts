import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { WorkspaceTeamMemberOverride } from 'src/domain/workspaces/application/ports/workspace-team-member-overrides-repository.port';
import { WorkspaceTeamMemberOverrideRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace-team-member-override.record';

@Injectable()
export class WorkspaceTeamMemberOverrideMapper {
  toDomain(
    record: WorkspaceTeamMemberOverrideRecord,
  ): WorkspaceTeamMemberOverride {
    return {
      teamGrantId: record.teamGrantId,
      userId: record.userId,
      role: record.role,
      excluded: record.excluded,
    };
  }

  toRecord(
    override: WorkspaceTeamMemberOverride,
  ): WorkspaceTeamMemberOverrideRecord {
    const record = new WorkspaceTeamMemberOverrideRecord();
    record.id = randomUUID();
    record.teamGrantId = override.teamGrantId;
    record.userId = override.userId;
    record.role = override.role;
    record.excluded = override.excluded;
    return record;
  }
}
