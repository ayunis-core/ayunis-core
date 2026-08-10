import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import {
  ThreadsRepository,
  type StaleThreadSourceRef,
} from '../../ports/threads.repository';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { DeleteSourcesCommand } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.command';
import { FindUnreferencedSourceIdsUseCase } from 'src/domain/sources/application/use-cases/find-unreferenced-source-ids/find-unreferenced-source-ids.use-case';
import { FindUnreferencedSourceIdsQuery } from 'src/domain/sources/application/use-cases/find-unreferenced-source-ids/find-unreferenced-source-ids.query';
import { CleanupStaleThreadSourcesResult } from './cleanup-stale-thread-sources.result';

const STALE_THREAD_SOURCE_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function groupSourcesByOrg(
  candidates: StaleThreadSourceRef[],
  unreferencedIds: UUID[],
): Map<UUID, UUID[]> {
  const unreferenced = new Set(unreferencedIds);
  const grouped = new Map<UUID, UUID[]>();
  for (const candidate of candidates) {
    if (!unreferenced.has(candidate.sourceId)) continue;
    const sourceIds = grouped.get(candidate.orgId) ?? [];
    sourceIds.push(candidate.sourceId);
    grouped.set(candidate.orgId, sourceIds);
  }
  return grouped;
}

@Injectable()
export class CleanupStaleThreadSourcesUseCase {
  private readonly logger = new Logger(CleanupStaleThreadSourcesUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly findUnreferencedSourceIdsUseCase: FindUnreferencedSourceIdsUseCase,
    private readonly deleteSourcesUseCase: DeleteSourcesUseCase,
  ) {}

  async execute(): Promise<CleanupStaleThreadSourcesResult> {
    const cutoff = new Date(Date.now() - STALE_THREAD_SOURCE_DAYS * MS_PER_DAY);
    this.logger.log('execute', { cutoff, staleDays: STALE_THREAD_SOURCE_DAYS });
    const candidates =
      await this.threadsRepository.findSourcesWithOnlyStaleDirectAssignments(
        cutoff,
      );
    const result = this.createResult(candidates.length);
    if (candidates.length === 0) return result;

    const candidateIds = candidates.map(({ sourceId }) => sourceId);
    const unreferencedIds = await this.findUnreferencedSourceIdsUseCase.execute(
      new FindUnreferencedSourceIdsQuery(candidateIds, cutoff),
    );
    result.unreferencedCount = unreferencedIds.length;
    const grouped = groupSourcesByOrg(candidates, unreferencedIds);
    await this.deleteGroups(grouped, result);
    return result;
  }

  private createResult(scannedCount: number): CleanupStaleThreadSourcesResult {
    return {
      scannedCount,
      unreferencedCount: 0,
      deletedCount: 0,
      failedCount: 0,
      errors: [],
    };
  }

  private async deleteGroups(
    grouped: Map<UUID, UUID[]>,
    result: CleanupStaleThreadSourcesResult,
  ): Promise<void> {
    for (const [orgId, sourceIds] of grouped) {
      try {
        await this.deleteSourcesUseCase.execute(
          new DeleteSourcesCommand(sourceIds, orgId),
        );
        result.deletedCount += sourceIds.length;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        result.failedCount += sourceIds.length;
        result.errors.push(
          ...sourceIds.map((sourceId) => ({ sourceId, error: message })),
        );
        this.logger.error('Batch delete failed', {
          error: error as Error,
          count: sourceIds.length,
          orgId,
        });
      }
    }
  }
}
