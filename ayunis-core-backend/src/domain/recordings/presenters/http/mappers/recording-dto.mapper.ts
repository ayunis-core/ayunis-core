import { Injectable } from '@nestjs/common';
import {
  recordingStatusOf,
  type RecordingDetails,
} from 'src/domain/recordings/application/models/recording-details';
import { RecordingSummaryStatus } from 'src/domain/recordings/domain/recording-summary-status.enum';
import type { RecordingSummary } from 'src/domain/recordings/domain/recording-summary.entity';
import { RecordingStatus } from 'src/domain/recordings/domain/recording-status.enum';
import { OrgRecording } from 'src/domain/recordings/domain/org-recording.entity';
import { PersonalRecording } from 'src/domain/recordings/domain/personal-recording.entity';
import type { Recording } from 'src/domain/recordings/domain/recording';
import { TeamRecording } from 'src/domain/recordings/domain/team-recording.entity';
import { RecordingOwnerType } from 'src/domain/recordings/presenters/http/dto/recording-owner.dto';
import type { RecordingResponseDto } from 'src/domain/recordings/presenters/http/dto/recording-response.dto';
import {
  RecordingSummaryState,
  type RecordingSummaryStateDto,
} from 'src/domain/recordings/presenters/http/dto/recording-summary-response.dto';

@Injectable()
export class RecordingDtoMapper {
  toDto({
    recording,
    creatorName,
    audio,
    summary,
  }: RecordingDetails): RecordingResponseDto {
    const status = recordingStatusOf({ audio, summary });
    return {
      id: recording.id,
      name: recording.name,
      ...this.toOwner(recording),
      creatorName,
      status,
      ...(status === RecordingStatus.FAILED && {
        failureCode: audio?.failureCode ?? undefined,
      }),
      ...(summary &&
        (status === RecordingStatus.SUMMARIZING ||
          status === RecordingStatus.READY) && {
          summary: this.toSummaryState(summary),
        }),
      createdAt: recording.createdAt,
      updatedAt: recording.updatedAt,
    };
  }

  private toSummaryState(summary: RecordingSummary): RecordingSummaryStateDto {
    switch (summary.status) {
      case RecordingSummaryStatus.READY:
        return {
          status: RecordingSummaryState.READY,
          modelName: summary.modelName ?? undefined,
          generatedAt: summary.generatedAt ?? undefined,
        };
      case RecordingSummaryStatus.FAILED:
        return {
          status: RecordingSummaryState.FAILED,
          failureCode: summary.failure ?? undefined,
        };
      case RecordingSummaryStatus.PENDING:
      case RecordingSummaryStatus.RUNNING:
        return { status: RecordingSummaryState.SUMMARIZING };
    }
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
