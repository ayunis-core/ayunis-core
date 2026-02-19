import type { WebhookEvent } from 'src/common/webhooks/domain/webhook-event.entity';

export class SendWebhookCommand {
  event: WebhookEvent;

  constructor(event: WebhookEvent) {
    this.event = event;
  }
}
