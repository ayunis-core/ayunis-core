import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FeatureFlag } from 'src/config/features.config';
import type { CitedRecording } from 'src/domain/recordings/application/models/recording-search';
import { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import {
  RecordingNotFoundError,
  UnexpectedRecordingError,
} from 'src/domain/recordings/application/recordings.errors';
import { RecordingAccessService } from 'src/domain/recordings/application/services/recording-access.service';
import { WorkspaceRecording } from 'src/domain/recordings/domain/workspace-recording.entity';
import { FindCitedRecordingQuery } from './find-cited-recording.query';

/**
 * A recording cited in a chat, while the recording search could still find
 * it there: recordings are enabled, the user can read it and a workspace
 * recording is cited in that workspace's chat.
 */
@Injectable()
export class FindCitedRecordingUseCase {
  private readonly logger = new Logger(FindCitedRecordingUseCase.name);

  constructor(
    private readonly repository: RecordingRepository,
    private readonly access: RecordingAccessService,
    private readonly config: ConfigService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRecordingError)
  async execute(query: FindCitedRecordingQuery): Promise<CitedRecording> {
    const { recordingId, workspaceId } = query;
    this.logger.log({ recordingId, workspaceId }, 'Finding cited recording');
    if (!this.config.get<boolean>(`features.${FeatureFlag.Recordings}`)) {
      throw new RecordingNotFoundError(recordingId);
    }
    const recording = await this.repository.findById(recordingId);
    if (
      !recording ||
      (recording instanceof WorkspaceRecording &&
        recording.workspaceId !== workspaceId)
    ) {
      throw new RecordingNotFoundError(recordingId);
    }
    await this.access.requireRead(recording);
    return {
      id: recording.id,
      name: recording.name,
      uploadedAt: recording.createdAt,
    };
  }
}
