import { Injectable } from '@nestjs/common';
import { CollectiveResourceAccessService } from 'src/domain/ownership/application/services/collective-resource-access.service';
import { RecordingNotFoundError } from 'src/domain/recordings/application/recordings.errors';
import type { CollectiveRecording } from 'src/domain/recordings/domain/recording';
import { TeamRecording } from 'src/domain/recordings/domain/team-recording.entity';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import type { CollectiveOwner } from 'src/iam/teams/application/models/collective-owner.model';
import { GetCollectiveOwnerAccessUseCase } from 'src/iam/teams/application/use-cases/get-collective-owner-access/get-collective-owner-access.use-case';
import { ListReadableCollectiveOwnersUseCase } from 'src/iam/teams/application/use-cases/list-readable-collective-owners/list-readable-collective-owners.use-case';

@Injectable()
export class CollectiveRecordingAccessService extends CollectiveResourceAccessService<CollectiveRecording> {
  constructor(
    getOwnerAccess: GetCollectiveOwnerAccessUseCase,
    listReadableOwners: ListReadableCollectiveOwnersUseCase,
  ) {
    super(getOwnerAccess, listReadableOwners, {
      permissions: {
        manage: Permission.MANAGE_RECORDINGS,
        team: Permission.MANAGE_TEAM_RECORDINGS,
        org: Permission.MANAGE_ORG_RECORDINGS,
      },
      notFound: (id) => new RecordingNotFoundError(id),
    });
  }

  protected ownerOf(recording: CollectiveRecording): CollectiveOwner {
    return recording instanceof TeamRecording
      ? { type: 'team', teamId: recording.teamId }
      : { type: 'org', orgId: recording.orgId };
  }
}
