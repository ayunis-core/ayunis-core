import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { FeatureFlag } from 'src/config/features.config';
import {
  OPARL_SYNC_DUE_SYSTEMS_INTERVAL_MS,
  OPARL_SYNC_DUE_SYSTEMS_JOB,
  OPARL_SYNC_DUE_SYSTEMS_SCHEDULER_ID,
  OPARL_SYNC_QUEUE,
} from './oparl-sync.constants';

/**
 * Upserts the sweep's BullMQ job scheduler on every instance's boot (the
 * upserts are idempotent, so instances share one schedule), or removes it
 * with the flag off.
 */
@Injectable()
export class OparlSyncScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(OparlSyncScheduler.name);

  constructor(
    @InjectQueue(OPARL_SYNC_QUEUE) private readonly queue: Queue,
    private readonly configService: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    // Not awaited: an unreachable Redis must not block the boot.
    this.schedule().catch((error: unknown) => {
      this.logger.error(
        { err: error as Error },
        'Could not schedule the OParl syncs',
      );
    });
  }

  async schedule(): Promise<void> {
    if (!this.configService.get<boolean>(`features.${FeatureFlag.Oparl}`)) {
      await this.queue.removeJobScheduler(OPARL_SYNC_DUE_SYSTEMS_SCHEDULER_ID);
      return;
    }
    await this.queue.upsertJobScheduler(
      OPARL_SYNC_DUE_SYSTEMS_SCHEDULER_ID,
      { every: OPARL_SYNC_DUE_SYSTEMS_INTERVAL_MS },
      {
        name: OPARL_SYNC_DUE_SYSTEMS_JOB,
        opts: {
          attempts: 1,
          removeOnComplete: 100,
          removeOnFail: { age: 7 * 24 * 60 * 60, count: 200 },
        },
      },
    );
  }
}
