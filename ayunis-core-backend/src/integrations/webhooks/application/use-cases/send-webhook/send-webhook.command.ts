import type { WebhookEvent } from '../../../domain/webhook-event.entity';

export class SendWebhookCommand {
  event: WebhookEvent;

  constructor(event: WebhookEvent) {
    this.event = event;
  }
}
