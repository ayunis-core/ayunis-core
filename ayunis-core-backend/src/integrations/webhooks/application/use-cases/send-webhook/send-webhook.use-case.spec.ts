import type { WebhookHandler } from 'src/integrations/webhooks/application/ports/webhook.handler';
import { WebhookEvent } from 'src/integrations/webhooks/domain/webhook-event.entity';
import { WebhookEventType } from 'src/integrations/webhooks/domain/value-objects/webhook-event-type.enum';
import { SendWebhookCommand } from './send-webhook.command';
import { SendWebhookUseCase } from './send-webhook.use-case';

class TestWebhookEvent extends WebhookEvent<Record<string, never>> {
  readonly eventType = WebhookEventType.ORG_CREATED;
  readonly data = {};
  readonly timestamp = new Date('2026-10-07T00:00:00.000Z');
}

describe('SendWebhookUseCase', () => {
  it('keeps ordinary business-event delivery best effort', async () => {
    const webhookHandler = {
      sendWebhook: jest.fn().mockRejectedValue(new Error('network down')),
    } as jest.Mocked<WebhookHandler>;
    const useCase = new SendWebhookUseCase(webhookHandler);

    await expect(
      useCase.execute(new SendWebhookCommand(new TestWebhookEvent())),
    ).resolves.toBeUndefined();
  });

  it('can propagate delivery failure to a monitored scheduled caller', async () => {
    const webhookHandler = {
      sendWebhook: jest.fn().mockRejectedValue(new Error('network down')),
    } as jest.Mocked<WebhookHandler>;
    const useCase = new SendWebhookUseCase(webhookHandler);

    await expect(
      useCase.executeOrThrow(new SendWebhookCommand(new TestWebhookEvent())),
    ).rejects.toThrow('network down');
  });
});
