import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { SubscriptionSyncEventsService } from 'src/integrations/core-connect/subscription-sync/application/services/subscription-sync-events.service';

@Injectable()
export class SubscriptionSyncOutboxTask {
  private readonly logger = new Logger(SubscriptionSyncOutboxTask.name);
  private running = false;
  constructor(private readonly events: SubscriptionSyncEventsService) {}

  @Interval(5000)
  async deliver(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.events.flush();
    } catch (error) {
      this.logger.error(
        { err: error },
        'External subscription event outbox unavailable',
      );
    } finally {
      this.running = false;
    }
  }
}
