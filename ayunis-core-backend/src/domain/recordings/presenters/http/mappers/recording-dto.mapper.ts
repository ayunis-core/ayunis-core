import { Injectable } from '@nestjs/common';
import type { RecordingWithCreator } from 'src/domain/recordings/application/models/recording-with-creator';
import { OrgRecording } from 'src/domain/recordings/domain/org-recording.entity';
import { PersonalRecording } from 'src/domain/recordings/domain/personal-recording.entity';
import type { Recording } from 'src/domain/recordings/domain/recording';
import { TeamRecording } from 'src/domain/recordings/domain/team-recording.entity';
import { RecordingOwnerType } from 'src/domain/recordings/presenters/http/dto/recording-owner.dto';
import type { RecordingResponseDto } from 'src/domain/recordings/presenters/http/dto/recording-response.dto';

@Injectable()
export class RecordingDtoMapper {
  toDto({
    recording,
    creatorName,
  }: RecordingWithCreator): RecordingResponseDto {
    return {
      id: recording.id,
      name: recording.name,
      ...this.toOwner(recording),
      creatorName,
      createdAt: recording.createdAt,
      updatedAt: recording.updatedAt,
    };
  }

  private toOwner(
    recording: Recording,
  ): Pick<RecordingResponseDto, 'ownerType' | 'workspaceId' | 'teamId'> {
    if (recording instanceof PersonalRecording) {
      return { ownerType: RecordingOwnerType.PERSONAL };
    }
    if (recording instanceof TeamRecording) {
      return { ownerType: RecordingOwnerType.TEAM, teamId: recording.teamId };
    }
    if (recording instanceof OrgRecording) {
      return { ownerType: RecordingOwnerType.ORG };
    }
    return {
      ownerType: RecordingOwnerType.WORKSPACE,
      workspaceId: recording.workspaceId,
    };
  }
}
