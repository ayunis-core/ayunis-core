import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SourceReindexProcessingPort } from 'src/domain/sources/application/ports/source-reindex-processing.port';
import { SourceReindexRepository } from 'src/domain/sources/application/ports/source-reindex.repository';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';

/** A REINDEXING source not queued for this long has probably lost its job. */
export const STALE_REINDEXING_AFTER_MS = 15 * 60 * 1000;
const MAX_PER_RUN = 500;

/**
 * Queues REINDEXING sources again whose job was lost, for instance when
 * queueing failed after they were flagged. A source still waiting in the
 * queue keeps its job, so this never runs a source twice.
 */
@Injectable()
export class SweepStaleReindexingUseCase {
  private readonly logger = new Logger(SweepStaleReindexingUseCase.name);

  constructor(
    private readonly reindexRepository: SourceReindexRepository,
    private readonly reindexQueue: SourceReindexProcessingPort,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(): Promise<number> {
    const targets = await this.reindexRepository.claimStaleReindexing(
      STALE_REINDEXING_AFTER_MS,
      MAX_PER_RUN,
    );
    const byOrg = new Map<UUID, UUID[]>();
    for (const { sourceId, orgId } of targets) {
      byOrg.set(orgId, [...(byOrg.get(orgId) ?? []), sourceId]);
    }
    for (const [orgId, sourceIds] of byOrg) {
      this.logger.log(
        { orgId, sourceCount: sourceIds.length },
        'Queueing stale re-index jobs again',
      );
      await this.reindexQueue.enqueue(orgId, sourceIds);
    }
    return targets.length;
  }
}
