import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { UUID } from 'crypto';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { MarkSourceFailedUseCase } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { MarkSourceFailedCommand } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.command';

/** Sources stuck in PROCESSING for longer than this are marked FAILED */
const STALE_PROCESSING_TIMEOUT_MS = 15 * 60 * 1000;
/** Upper bound per run so a large backlog cannot overlap the next run */
const MAX_SOURCES_PER_RUN = 100;

@Injectable()
export class StaleProcessingCleanupTask {
  private isRunning = false;

  constructor(
    @InjectPinoLogger(StaleProcessingCleanupTask.name)
    private readonly logger: PinoLogger,
    private readonly sourceRepository: SourceRepository,
    private readonly markSourceFailedUseCase: MarkSourceFailedUseCase,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCleanup(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Cleanup already running, skipping this execution');
      return;
    }

    this.isRunning = true;
    try {
      await this.failStaleSources();
    } catch (error) {
      this.logger.error(
        {
          err: error as Error,
        },
        'Stale processing cleanup failed',
      );
    } finally {
      this.isRunning = false;
    }
  }

  private async failStaleSources(): Promise<void> {
    const staleBefore = new Date(Date.now() - STALE_PROCESSING_TIMEOUT_MS);

    const staleSourceIds =
      await this.sourceRepository.findStaleProcessingSourceIds(
        staleBefore,
        MAX_SOURCES_PER_RUN,
      );

    if (staleSourceIds.length === 0) {
      return;
    }

    this.logger.warn(
      { sourceIds: staleSourceIds, sourceCount: staleSourceIds.length },
      'Found stale processing sources',
    );

    for (const sourceId of staleSourceIds) {
      await this.markSourceAsFailed(sourceId);
    }
  }

  private async markSourceAsFailed(sourceId: UUID): Promise<void> {
    try {
      await this.markSourceFailedUseCase.execute(
        new MarkSourceFailedCommand({
          sourceId,
          errorMessage: 'Processing timed out',
        }),
      );
      this.logger.warn({ sourceId }, 'Marked stale source as failed');
    } catch (error) {
      this.logger.error(
        {
          sourceId,
          err: error as Error,
        },
        'Failed to mark stale source as failed',
      );
    }
  }
}
