import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import {
  RecordingNotFoundError,
  UnexpectedRecordingError,
} from 'src/domain/recordings/application/recordings.errors';
import type { RecordingDetails } from 'src/domain/recordings/application/models/recording-details';
import { RecordingAccessService } from 'src/domain/recordings/application/services/recording-access.service';
import { RecordingDetailsService } from 'src/domain/recordings/application/services/recording-details.service';
import { FindRecordingQuery } from './find-recording.query';

@Injectable()
export class FindRecordingUseCase {
  private readonly logger = new Logger(FindRecordingUseCase.name);

  constructor(
    private readonly repository: RecordingRepository,
    private readonly access: RecordingAccessService,
    private readonly details: RecordingDetailsService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRecordingError)
  async execute(query: FindRecordingQuery): Promise<RecordingDetails> {
    this.logger.log({ recordingId: query.id }, 'Finding recording');
    const recording = await this.repository.findById(query.id);
    if (!recording) throw new RecordingNotFoundError(query.id);
    await this.access.requireRead(recording);
    const [details] = await this.details.describe([recording]);
    return details;
  }
}
