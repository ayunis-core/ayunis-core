import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { OrgRecording } from 'src/domain/recordings/domain/org-recording.entity';
import { PersonalRecording } from 'src/domain/recordings/domain/personal-recording.entity';
import type { Recording } from 'src/domain/recordings/domain/recording';
import { TeamRecording } from 'src/domain/recordings/domain/team-recording.entity';
import { WorkspaceRecording } from 'src/domain/recordings/domain/workspace-recording.entity';
import { RecordingRecord } from 'src/domain/recordings/infrastructure/persistence/local/schema/recording.record';

type Owner =
  | { type: 'user'; id: UUID }
  | { type: 'workspace'; id: UUID }
  | { type: 'team'; id: UUID }
  | { type: 'org' };

@Injectable()
export class RecordingMapper {
  toDomain(record: RecordingRecord): Recording {
    const params = {
      id: record.id,
      name: record.name,
      orgId: record.orgId,
      createdByUserId: record.createdByUserId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
    const owner = this.ownerOf(record);
    switch (owner.type) {
      case 'user':
        return new PersonalRecording({ ...params, userId: owner.id });
      case 'workspace':
        return new WorkspaceRecording({ ...params, workspaceId: owner.id });
      case 'team':
        return new TeamRecording({ ...params, teamId: owner.id });
      case 'org':
        return new OrgRecording(params);
    }
  }

  toRecord(recording: Recording): RecordingRecord {
    const record = new RecordingRecord();
    record.id = recording.id;
    record.name = recording.name;
    record.orgId = recording.orgId;
    record.userId =
      recording instanceof PersonalRecording ? recording.userId : null;
    record.workspaceId =
      recording instanceof WorkspaceRecording ? recording.workspaceId : null;
    record.teamId =
      recording instanceof TeamRecording ? recording.teamId : null;
    record.isOrgOwned = recording instanceof OrgRecording;
    record.createdByUserId = recording.createdByUserId;
    record.createdAt = recording.createdAt;
    record.updatedAt = recording.updatedAt;
    return record;
  }

  private ownerOf(record: RecordingRecord): Owner {
    const owners: Owner[] = [
      ...(record.userId ? [{ type: 'user' as const, id: record.userId }] : []),
      ...(record.workspaceId
        ? [{ type: 'workspace' as const, id: record.workspaceId }]
        : []),
      ...(record.teamId ? [{ type: 'team' as const, id: record.teamId }] : []),
      ...(record.isOrgOwned ? [{ type: 'org' as const }] : []),
    ];
    if (owners.length !== 1) {
      throw new Error(`Recording ${record.id} has invalid ownership`);
    }
    return owners[0];
  }
}
