import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SourceTranscriptRepository } from 'src/domain/sources/application/ports/source-transcript.repository';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import type { TranscriptSegment } from 'src/domain/transcriptions/domain/recording-transcript';
import { GetSourceTranscriptSegmentsQuery } from './get-source-transcript-segments.query';

/**
 * The timed segments of a recording's transcript; empty until it is
 * transcribed. Performs no authorization: callers check access first.
 */
@Injectable()
export class GetSourceTranscriptSegmentsUseCase {
  private readonly logger = new Logger(GetSourceTranscriptSegmentsUseCase.name);

  constructor(private readonly transcripts: SourceTranscriptRepository) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(
    query: GetSourceTranscriptSegmentsQuery,
  ): Promise<TranscriptSegment[]> {
    this.logger.log(
      { sourceId: query.sourceId },
      'Reading transcript segments',
    );
    return this.transcripts.findBySourceId(query.sourceId);
  }
}
