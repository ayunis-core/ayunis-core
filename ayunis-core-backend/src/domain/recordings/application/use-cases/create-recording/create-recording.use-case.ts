import { Injectable, Logger } from '@nestjs/common';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { recordingOwnedBy } from 'src/domain/recordings/application/models/recording-owner';
import { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import { UnexpectedRecordingError } from 'src/domain/recordings/application/recordings.errors';
import { RecordingAccessService } from 'src/domain/recordings/application/services/recording-access.service';
import type { Recording } from 'src/domain/recordings/domain/recording';
import { CreateRecordingCommand } from './create-recording.command';

@Injectable()
export class CreateRecordingUseCase {
  private readonly logger = new Logger(CreateRecordingUseCase.name);

  constructor(
    private readonly repository: RecordingRepository,
    private readonly access: RecordingAccessService,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRecordingError)
  async execute(command: CreateRecordingCommand): Promise<Recording> {
    this.logger.log({ ownerType: command.owner.type }, 'Creating recording');
    const { userId, orgId } = getRequiredUserContext(this.context);
    const recording = recordingOwnedBy(
      command.owner,
      { name: command.name, orgId, createdByUserId: userId },
      userId,
    );
    await this.access.requireCreate(recording);
    return this.repository.save(recording);
  }
}
