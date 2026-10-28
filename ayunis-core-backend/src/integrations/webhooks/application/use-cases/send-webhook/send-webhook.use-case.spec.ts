import { SendWebhookUseCase } from './send-webhook.use-case';
import { SendWebhookCommand } from './send-webhook.command';
import { WebhookDeliveryFailedError } from 'src/integrations/webhooks/application/errors/webhook.errors';
import type { SubscriptionExpiredWebhookEvent } from 'src/integrations/webhooks/domain/webhook-events/subscription-expired.webhook-event';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';

const event = {
  eventType: WebhookEventType.SUBSCRIPTION_EXPIRED,
} as SubscriptionExpiredWebhookEvent;

describe('SendWebhookUseCase delivery failures', () => {
  const error = new WebhookDeliveryFailedError(
    event.eventType,
    'receiver down',
  );
  const handler = { sendWebhook: jest.fn().mockRejectedValue(error) };
  const useCase = new SendWebhookUseCase(handler);

  it('retains best-effort delivery for existing callers', async () => {
    await expect(
      useCase.execute(new SendWebhookCommand(event)),
    ).resolves.toBeUndefined();
  });

  it('propagates required delivery failures so expiry can be retried', async () => {
    await expect(
      useCase.execute(new SendWebhookCommand(event, true)),
    ).rejects.toBe(error);
  });
});
