import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';

const HEARTBEAT_INTERVAL_MS = 60 * 1000;

@Injectable()
export class SourceProcessingHeartbeatService {
  private readonly logger = new Logger(SourceProcessingHeartbeatService.name);

  constructor(private readonly sourceRepository: SourceRepository) {}

  async run<T>(sourceId: UUID, operation: () => Promise<T>): Promise<T> {
    let inFlight: Promise<void> | undefined;
    const timer = setInterval(() => {
      if (inFlight) return;
      inFlight = this.refresh(sourceId)
        .then((alive) => {
          if (!alive) clearInterval(timer);
        })
        .finally(() => {
          inFlight = undefined;
        });
    }, HEARTBEAT_INTERVAL_MS);
    timer.unref();

    try {
      return await operation();
    } finally {
      clearInterval(timer);
      // Drain an outstanding write before the consumer saves or retries.
      await inFlight;
    }
  }

  private async refresh(sourceId: UUID): Promise<boolean> {
    try {
      return await this.sourceRepository.refreshProcessingHeartbeat(sourceId);
    } catch (error) {
      this.logger.warn(
        { sourceId, err: error as Error },
        'Could not refresh source processing heartbeat',
      );
      return true;
    }
  }
}
