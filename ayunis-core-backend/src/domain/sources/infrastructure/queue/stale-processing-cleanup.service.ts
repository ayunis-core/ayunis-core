import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import { MarkSourceFailedUseCase } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.use-case';
import { MarkSourceFailedCommand } from 'src/domain/sources/application/use-cases/mark-source-failed/mark-source-failed.command';

/** Sources stuck in PROCESSING for longer than this are marked FAILED */
const STALE_THRESHOLD_MINUTES = 15;

@Injectable()
export class StaleProcessingCleanupService {
  private readonly logger = new Logger(StaleProcessingCleanupService.name);

  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly markSourceFailedUseCase: MarkSourceFailedUseCase,
  ) {}

  @Cron('*/5 * * * *')
  async handleCron(): Promise<void> {
    const threshold = new Date(
      Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000,
    );

    const staleSources =
      await this.sourceRepository.findStaleProcessingSources(threshold);

    if (staleSources.length === 0) {
      return;
    }

    this.logger.warn(`Found ${staleSources.length} stale processing sources`, {
      sourceIds: staleSources.map((s) => s.id),
    });

    for (const source of staleSources) {
      try {
        await this.markSourceFailedUseCase.execute(
          new MarkSourceFailedCommand({
            sourceId: source.id,
            errorMessage: 'Processing timed out',
          }),
        );
        this.logger.warn('Marked stale source as failed', {
          sourceId: source.id,
        });
      } catch (err) {
        this.logger.error('Failed to mark stale source as failed', {
          sourceId: source.id,
          error: err as Error,
        });
      }
    }
  }
}
