import type { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';

export class SendWebhookCommand {
  event: WebhookEvent;

  constructor(
    event: WebhookEvent,
    public readonly propagateFailure = false,
  ) {
    this.event = event;
  }
}
