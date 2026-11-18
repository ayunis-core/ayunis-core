import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import {
  RecordingNotFoundError,
  UnexpectedRecordingError,
} from 'src/domain/recordings/application/recordings.errors';
import { RecordingAccessService } from 'src/domain/recordings/application/services/recording-access.service';
import type { Recording } from 'src/domain/recordings/domain/recording';
import { RenameRecordingCommand } from './rename-recording.command';

@Injectable()
export class RenameRecordingUseCase {
  private readonly logger = new Logger(RenameRecordingUseCase.name);

  constructor(
    private readonly repository: RecordingRepository,
    private readonly access: RecordingAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRecordingError)
  @Transactional()
  async execute(command: RenameRecordingCommand): Promise<Recording> {
    this.logger.log({ recordingId: command.recordingId }, 'Renaming recording');
    // The lock keeps a concurrent owner change from being overwritten.
    const recording = await this.repository.findById(command.recordingId, {
      lock: true,
    });
    if (!recording) throw new RecordingNotFoundError(command.recordingId);
    await this.access.requireWrite(recording);
    recording.rename(command.name);
    return this.repository.save(recording);
  }
}
