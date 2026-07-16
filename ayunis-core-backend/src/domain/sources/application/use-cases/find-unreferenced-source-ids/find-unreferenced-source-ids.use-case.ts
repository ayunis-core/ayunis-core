import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { SourceRepository } from '../../ports/source.repository';
import { FindUnreferencedSourceIdsQuery } from './find-unreferenced-source-ids.query';
import { UnexpectedSourceError } from '../../sources.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';

// Centralises cross-module reachability in the sources domain: callers pass
// candidate IDs (e.g. from a threads-side stale query) and get back the subset
// that are not attached to any skill, agent, or knowledge base. Keeps skill /
// agent schema knowledge out of other modules' adapters.
@Injectable()
export class FindUnreferencedSourceIdsUseCase {
  private readonly logger = new Logger(FindUnreferencedSourceIdsUseCase.name);

  constructor(private readonly sourceRepository: SourceRepository) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(query: FindUnreferencedSourceIdsQuery): Promise<UUID[]> {
    this.logger.log('execute', {
      candidateCount: query.candidateIds.length,
      olderThan: query.olderThan,
    });

    if (query.candidateIds.length === 0) {
      return [];
    }

    return await this.sourceRepository.findUnreferencedIds(
      query.candidateIds,
      query.olderThan,
    );
  }
}
