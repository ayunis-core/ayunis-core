import { Injectable, Logger } from '@nestjs/common';
import { ThreadsRepository } from '../../ports/threads.repository';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { DeleteSourcesCommand } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.command';
import { FindUnreferencedSourceIdsUseCase } from 'src/domain/sources/application/use-cases/find-unreferenced-source-ids/find-unreferenced-source-ids.use-case';
import { FindUnreferencedSourceIdsQuery } from 'src/domain/sources/application/use-cases/find-unreferenced-source-ids/find-unreferenced-source-ids.query';
import { CleanupStaleThreadSourcesResult } from './cleanup-stale-thread-sources.result';

const STALE_THREAD_SOURCE_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
    this.logger.log('execute', {
      cutoff,
      staleDays: STALE_THREAD_SOURCE_DAYS,
    });

    const result: CleanupStaleThreadSourcesResult = {
      scannedCount: 0,
      unreferencedCount: 0,
      deletedCount: 0,
      failedCount: 0,
      errors: [],
    };

    const candidateIds =
      await this.threadsRepository.findSourceIdsWithOnlyStaleDirectAssignments(
        cutoff,
      );
    result.scannedCount = candidateIds.length;

    if (candidateIds.length === 0) {
      return result;
    }

    const unreferencedIds = await this.findUnreferencedSourceIdsUseCase.execute(
      new FindUnreferencedSourceIdsQuery(candidateIds, cutoff),
    );
    result.unreferencedCount = unreferencedIds.length;

    if (unreferencedIds.length === 0) {
      return result;
    }

    try {
      await this.deleteSourcesUseCase.execute(
        new DeleteSourcesCommand(unreferencedIds),
      );
      result.deletedCount = unreferencedIds.length;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      result.failedCount = unreferencedIds.length;
      result.errors = unreferencedIds.map((sourceId) => ({
        sourceId,
        error: errorMessage,
      }));
      this.logger.error('Batch delete failed', {
        error: error as Error,
        count: unreferencedIds.length,
      });
    }

    return result;
  }
}
