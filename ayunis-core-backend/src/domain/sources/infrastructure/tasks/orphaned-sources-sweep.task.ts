import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { checkIn } from '@appsignal/nodejs';
import { SweepOrphanedSourcesUseCase } from 'src/domain/sources/application/use-cases/sweep-orphaned-sources/sweep-orphaned-sources.use-case';

/**
 * Nightly at 2:45, after the originals sweep. Sources left behind by a user
 * or thread cascade whose deferred cleanup failed have no other way back
 * into any cleanup (AYC-1541).
 */
@Injectable()
export class OrphanedSourcesSweepTask {
  private readonly logger = new Logger(OrphanedSourcesSweepTask.name);

  private isRunning = false;

  constructor(
    private readonly sweepOrphanedSources: SweepOrphanedSourcesUseCase,
  ) {}

  @Cron('45 2 * * *')
  async handleSweep(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Orphaned sources sweep already running');
      return;
    }
    this.isRunning = true;
    try {
      await checkIn.cron('orphaned_sources_sweep', async () => {
        const result = await this.sweepOrphanedSources.execute();
        this.logger.log({ ...result }, 'Orphaned sources sweep done');
      });
    } catch (error) {
      this.logger.error(
        { err: error as Error },
        'Orphaned sources sweep failed',
      );
    } finally {
      this.isRunning = false;
    }
  }
}
