import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SweepSourceUploadSessionsUseCase } from 'src/domain/sources/application/use-cases/sweep-source-upload-sessions/sweep-source-upload-sessions.use-case';

@Injectable()
export class SourceUploadSweepTask {
  private readonly logger = new Logger(SourceUploadSweepTask.name);

  private isRunning = false;

  constructor(private readonly sweep: SweepSourceUploadSessionsUseCase) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleSweep(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Upload sweep already running, skipping this execution');
      return;
    }
    this.isRunning = true;
    try {
      const result = await this.sweep.execute();
      if (Object.values(result).some((count) => count > 0)) {
        this.logger.log(result, 'Source upload sweep completed');
      }
    } catch (error) {
      this.logger.error({ err: error as Error }, 'Source upload sweep failed');
    } finally {
      this.isRunning = false;
    }
  }
}
