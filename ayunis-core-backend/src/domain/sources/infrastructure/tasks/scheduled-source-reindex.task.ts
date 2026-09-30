import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import type { DueSourceReindex } from 'src/domain/sources/application/models/due-source-reindex';
import { SourceReindexOutcome } from 'src/domain/sources/application/services/source-reindex-handler';
import { SourceReindexHandlerRegistry } from 'src/domain/sources/application/services/source-reindex-handler.registry';

const EVERY_15_MINUTES = '0 */15 * * * *';
/** Upper bound per sweep; the rest stays due and is claimed by the next one. */
const MAX_SOURCES_PER_SWEEP = 100;

/**
 * Starts the re-index of every source whose schedule is due. Runs on every
 * backend instance: the claim itself keeps instances from starting a source
 * twice, `isRunning` only keeps one instance's sweeps from overlapping.
 */
@Injectable()
export class ScheduledSourceReindexTask {
  private readonly logger = new Logger(ScheduledSourceReindexTask.name);

  private isRunning = false;

  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly handlers: SourceReindexHandlerRegistry,
  ) {}

  @Cron(EVERY_15_MINUTES)
  async handleSweep(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Re-index sweep already running, skipping');
      return;
    }

    this.isRunning = true;
    try {
      const claimed = await this.sourceRepository.claimDueReindexes(
        MAX_SOURCES_PER_SWEEP,
      );
      for (const due of claimed) await this.start(due);
    } catch (error) {
      this.logger.error({ err: error as Error }, 'Re-index sweep failed');
    } finally {
      this.isRunning = false;
    }
  }

  private async start(due: DueSourceReindex): Promise<void> {
    const handler = this.handlers.find(due.subtype);
    if (!handler) {
      this.logger.warn(
        { sourceId: due.sourceId, subtype: due.subtype },
        'No re-index handler for source type, skipping',
      );
      return;
    }

    try {
      const outcome = await handler.start(due);
      if (outcome === SourceReindexOutcome.STARTED) {
        this.logger.log(
          { sourceId: due.sourceId },
          'Scheduled re-index started',
        );
      }
    } catch (error) {
      this.logger.error(
        { sourceId: due.sourceId, err: error as Error },
        'Could not start scheduled re-index, retrying next sweep',
      );
      await this.release(due);
    }
  }

  /**
   * The claim already moved the source a whole interval ahead; without this
   * a transient queue outage would silently skip that interval.
   */
  private async release(due: DueSourceReindex): Promise<void> {
    try {
      await this.sourceRepository.releaseReindexClaim(due);
    } catch (error) {
      this.logger.error(
        { sourceId: due.sourceId, err: error as Error },
        'Could not hand back re-index claim; next run is one interval away',
      );
    }
  }
}
