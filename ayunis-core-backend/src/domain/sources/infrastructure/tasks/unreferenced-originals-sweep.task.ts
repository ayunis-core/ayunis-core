import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { checkIn } from '@appsignal/nodejs';
import { SweepUnreferencedOriginalsUseCase } from 'src/domain/sources/application/use-cases/sweep-unreferenced-originals/sweep-unreferenced-originals.use-case';

/**
 * Nightly at 2:30, between the 2 AM orphan-storage sweep and the 3 AM
 * orphaned-images cleanup. Retried deletes of retained originals have no
 * row to hang on, so this task is their only second chance (AYC-1541).
 */
@Injectable()
export class UnreferencedOriginalsSweepTask {
  private readonly logger = new Logger(UnreferencedOriginalsSweepTask.name);

  private isRunning = false;

  constructor(
    private readonly sweepUnreferencedOriginals: SweepUnreferencedOriginalsUseCase,
  ) {}

  @Cron('30 2 * * *')
  async handleSweep(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Unreferenced originals sweep already running');
      return;
    }
    this.isRunning = true;
    try {
      await checkIn.cron('unreferenced_originals_sweep', async () => {
        const result = await this.sweepUnreferencedOriginals.execute();
        this.logger.log({ ...result }, 'Unreferenced originals sweep done');
      });
    } catch (error) {
      this.logger.error(
        { err: error as Error },
        'Unreferenced originals sweep failed',
      );
    } finally {
      this.isRunning = false;
    }
  }
}
