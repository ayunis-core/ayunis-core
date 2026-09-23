import { Injectable, type OnApplicationShutdown } from '@nestjs/common';

@Injectable()
export class WebhookDeliverySequencer implements OnApplicationShutdown {
  private readonly tails = new Map<string, Promise<void>>();

  enqueue(key: string, operation: () => Promise<void>): Promise<void> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(operation);
    const tracked = current.finally(() => {
      if (this.tails.get(key) === tracked) {
        this.tails.delete(key);
      }
    });
    this.tails.set(key, tracked);
    return tracked;
  }

  async onApplicationShutdown(): Promise<void> {
    while (this.tails.size > 0) {
      await Promise.allSettled([...this.tails.values()]);
    }
  }
}
