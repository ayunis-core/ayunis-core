import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { FynnSyncEventsService } from 'src/integrations/fynn/application/services/fynn-sync-events.service';

@Injectable()
export class FynnOutboxTask {
  private readonly logger = new Logger(FynnOutboxTask.name);
  private running = false;
  constructor(private readonly events: FynnSyncEventsService) {}

  @Interval(5000)
  async deliver(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.events.flush();
    } catch (error) {
      this.logger.error({ err: error }, 'Fynn event outbox unavailable');
    } finally {
      this.running = false;
    }
  }
}
