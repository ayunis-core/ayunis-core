import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SweepStaleReindexingUseCase } from 'src/domain/sources/application/use-cases/sweep-stale-reindexing/sweep-stale-reindexing.use-case';

@Injectable()
export class StaleReindexingSweepTask {
  private readonly logger = new Logger(StaleReindexingSweepTask.name);

  private isRunning = false;

  constructor(
    private readonly sweepStaleReindexing: SweepStaleReindexingUseCase,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleSweep(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Stale re-indexing sweep already running');
      return;
    }
    this.isRunning = true;
    try {
      const queued = await this.sweepStaleReindexing.execute();
      if (queued > 0) {
        this.logger.warn({ queued }, 'Queued stale re-index jobs again');
      }
    } catch (error) {
      this.logger.error(
        { err: error as Error },
        'Stale re-indexing sweep failed',
      );
    } finally {
      this.isRunning = false;
    }
  }
}
