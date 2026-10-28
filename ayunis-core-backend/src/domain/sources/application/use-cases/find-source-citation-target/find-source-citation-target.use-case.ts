import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { SourceCitationTarget } from 'src/domain/sources/application/models/source-citation-target';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import { FindSourceCitationTargetQuery } from './find-source-citation-target.query';

@Injectable()
export class FindSourceCitationTargetUseCase {
  private readonly logger = new Logger(FindSourceCitationTargetUseCase.name);

  constructor(private readonly sourceRepository: SourceRepository) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(
    query: FindSourceCitationTargetQuery,
  ): Promise<SourceCitationTarget | null> {
    this.logger.log({ chunkId: query.chunkId }, 'Finding citation target');
    return this.sourceRepository.findCitationTarget(query.chunkId);
  }
}
