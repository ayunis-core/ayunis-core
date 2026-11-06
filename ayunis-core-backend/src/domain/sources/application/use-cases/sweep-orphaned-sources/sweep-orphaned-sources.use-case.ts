import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { chunk } from 'src/common/util/chunk';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import { DeleteSourcesCommand } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.command';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import type { Source } from 'src/domain/sources/domain/source.entity';

/** Matches the stale-thread sweep: a month without any reference is final. */
export const ORPHANED_SOURCE_MIN_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_PER_RUN = 5000;
const DELETE_BATCH_SIZE = 500;
const UUID_PREFIX =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i;

export interface SweepOrphanedSourcesResult {
  candidateCount: number;
  deletedCount: number;
  failedCount: number;
}

/**
 * Sources have no owner column: when a user or thread cascade removes the
 * rows that pointed at them and the deferred cleanup fails, nothing else ever
 * revisits them. This nightly sweep deletes sources that no thread, skill or
 * knowledge base has referenced for a month, releasing their indexes and
 * retained originals. The org is recovered from the original's key when there
 * is one; without it the processing prefix is simply left to the org purge.
 */
@Injectable()
export class SweepOrphanedSourcesUseCase {
  private readonly logger = new Logger(SweepOrphanedSourcesUseCase.name);

  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly deleteSources: DeleteSourcesUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(now: Date = new Date()): Promise<SweepOrphanedSourcesResult> {
    const cutoff = new Date(now.getTime() - ORPHANED_SOURCE_MIN_AGE_MS);
    const ids = await this.sourceRepository.findOrphanedIds(
      cutoff,
      MAX_PER_RUN,
    );
    const result: SweepOrphanedSourcesResult = {
      candidateCount: ids.length,
      deletedCount: 0,
      failedCount: 0,
    };
    if (ids.length === 0) return result;

    const sources = await this.sourceRepository.findByIds(ids);
    for (const [orgId, group] of groupByOrg(sources)) {
      for (const batch of chunk(group, DELETE_BATCH_SIZE)) {
        await this.deleteBatch(orgId, batch, result);
      }
    }
    this.logger.log({ ...result }, 'Swept orphaned sources');
    return result;
  }

  private async deleteBatch(
    orgId: UUID | null,
    sourceIds: UUID[],
    result: SweepOrphanedSourcesResult,
  ): Promise<void> {
    try {
      await this.deleteSources.execute(
        new DeleteSourcesCommand(sourceIds, orgId),
      );
      result.deletedCount += sourceIds.length;
    } catch (error) {
      result.failedCount += sourceIds.length;
      this.logger.error(
        { err: error as Error, orgId, count: sourceIds.length },
        'Orphaned source batch delete failed',
      );
    }
  }
}

function groupByOrg(sources: Source[]): Map<UUID | null, UUID[]> {
  const groups = new Map<UUID | null, UUID[]>();
  for (const source of sources) {
    const orgId = (UUID_PREFIX.exec(source.storageKey ?? '')?.[1] ??
      null) as UUID | null;
    const ids = groups.get(orgId) ?? [];
    ids.push(source.id);
    groups.set(orgId, ids);
  }
  return groups;
}
