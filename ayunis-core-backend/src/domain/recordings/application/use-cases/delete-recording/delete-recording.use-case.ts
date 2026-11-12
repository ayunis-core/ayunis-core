import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { runDeferredCleanup } from 'src/common/events/run-deferred-cleanup';
import { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import {
  RecordingNotFoundError,
  UnexpectedRecordingError,
} from 'src/domain/recordings/application/recordings.errors';
import { RecordingAccessService } from 'src/domain/recordings/application/services/recording-access.service';
import {
  RecordingCleanupService,
  type DeletedRecordings,
} from 'src/domain/recordings/application/services/recording-cleanup.service';
import { DeleteRecordingCommand } from './delete-recording.command';

@Injectable()
export class DeleteRecordingUseCase {
  private readonly logger = new Logger(DeleteRecordingUseCase.name);

  constructor(
    private readonly repository: RecordingRepository,
    private readonly access: RecordingAccessService,
    private readonly cleanup: RecordingCleanupService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRecordingError)
  async execute(command: DeleteRecordingCommand): Promise<void> {
    this.logger.log({ recordingId: command.recordingId }, 'Deleting recording');
    const deleted = await this.deleteRecord(command);
    // Cleanup reaches outside the database, so it waits for the commit.
    await runDeferredCleanup(
      [
        {
          label: 'clean up deleted recording',
          run: () => this.cleanup.cleanUp(deleted),
        },
      ],
      this.logger,
    );
  }

  @Transactional()
  private async deleteRecord(
    command: DeleteRecordingCommand,
  ): Promise<DeletedRecordings> {
    const recording = await this.repository.findById(command.recordingId, {
      lock: true,
    });
    if (!recording) throw new RecordingNotFoundError(command.recordingId);
    await this.access.requireWrite(recording);
    const deleted = await this.cleanup.snapshot([recording]);
    await this.repository.delete(recording);
    return deleted;
  }
}
