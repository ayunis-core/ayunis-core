import type { AnyWebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';

export class SendWebhookCommand {
  event: AnyWebhookEvent;

  constructor(
    event: AnyWebhookEvent,
    public readonly propagateFailure = false,
  ) {
    this.event = event;
  }
}
