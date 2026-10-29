import type { AnyWebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';

export abstract class WebhookHandler {
  abstract sendWebhook(event: AnyWebhookEvent): Promise<void>;
}
