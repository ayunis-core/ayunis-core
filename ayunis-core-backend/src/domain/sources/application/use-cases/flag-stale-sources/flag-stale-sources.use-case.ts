import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SourceReindexRepository } from 'src/domain/sources/application/ports/source-reindex.repository';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import { FlagStaleSourcesCommand } from './flag-stale-sources.command';

/**
 * Moves an org's text sources that are not indexed with its embedding model
 * to REINDEXING, in the ambient transaction, and returns their ids for
 * queueing once it has committed.
 */
@Injectable()
export class FlagStaleSourcesUseCase {
  private readonly logger = new Logger(FlagStaleSourcesUseCase.name);

  constructor(private readonly reindexRepository: SourceReindexRepository) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(command: FlagStaleSourcesCommand): Promise<UUID[]> {
    const { orgId, embeddingModelId } = command;
    this.logger.log({ orgId, embeddingModelId }, 'Flagging stale sources');
    return this.reindexRepository.flagOrgSourcesForReindex(
      orgId,
      embeddingModelId,
    );
  }
}
