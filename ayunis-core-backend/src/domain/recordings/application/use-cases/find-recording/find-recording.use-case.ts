import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import {
  RecordingNotFoundError,
  UnexpectedRecordingError,
} from 'src/domain/recordings/application/recordings.errors';
import type { RecordingWithCreator } from 'src/domain/recordings/application/models/recording-with-creator';
import { RecordingAccessService } from 'src/domain/recordings/application/services/recording-access.service';
import { RecordingCreatorNameService } from 'src/domain/recordings/application/services/recording-creator-name.service';
import { FindRecordingQuery } from './find-recording.query';

@Injectable()
export class FindRecordingUseCase {
  private readonly logger = new Logger(FindRecordingUseCase.name);

  constructor(
    private readonly repository: RecordingRepository,
    private readonly access: RecordingAccessService,
    private readonly creatorNames: RecordingCreatorNameService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedRecordingError)
  async execute(query: FindRecordingQuery): Promise<RecordingWithCreator> {
    this.logger.log({ recordingId: query.id }, 'Finding recording');
    const recording = await this.repository.findById(query.id);
    if (!recording) throw new RecordingNotFoundError(query.id);
    await this.access.requireRead(recording);
    const [withCreator] = await this.creatorNames.withCreators([recording]);
    return withCreator;
  }
}
