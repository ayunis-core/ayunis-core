import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ExternalSubscriptionEventsService } from 'src/integrations/external-subscriptions/application/services/external-subscription-events.service';

@Injectable()
export class ExternalSubscriptionOutboxTask {
  private readonly logger = new Logger(ExternalSubscriptionOutboxTask.name);
  private running = false;
  constructor(private readonly events: ExternalSubscriptionEventsService) {}

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
