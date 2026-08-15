import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import { SourceRepository } from '../../ports/source.repository';
import { FindUnreferencedSourceIdsQuery } from './find-unreferenced-source-ids.query';
import { UnexpectedSourceError } from '../../sources.errors';
import { ApplicationError } from 'src/common/errors/base.error';

// Centralises cross-module reachability in the sources domain: callers pass
// candidate IDs (e.g. from a threads-side stale query) and get back the subset
// that are not attached to any skill, agent, or knowledge base. Keeps skill /
// agent schema knowledge out of other modules' adapters.
@Injectable()
export class FindUnreferencedSourceIdsUseCase {
  constructor(
    @InjectPinoLogger(FindUnreferencedSourceIdsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly sourceRepository: SourceRepository,
  ) {}

  async execute(query: FindUnreferencedSourceIdsQuery): Promise<UUID[]> {
    this.logger.info(
      {
        candidateCount: query.candidateIds.length,
        olderThan: query.olderThan,
      },
      'execute',
    );

    if (query.candidateIds.length === 0) {
      return [];
    }

    try {
      return await this.sourceRepository.findUnreferencedIds(
        query.candidateIds,
        query.olderThan,
      );
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
        },
        'Error finding unreferenced source IDs',
      );
      throw new UnexpectedSourceError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
