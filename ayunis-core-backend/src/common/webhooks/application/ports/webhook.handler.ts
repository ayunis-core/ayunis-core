import { WebhookEvent } from '../../domain/webhook-event.entity';

export abstract class WebhookHandler {
  abstract sendWebhook(event: WebhookEvent): Promise<void>;
}
