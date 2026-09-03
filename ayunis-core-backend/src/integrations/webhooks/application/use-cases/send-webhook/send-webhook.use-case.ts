import { Injectable, Logger } from '@nestjs/common';
import { SendWebhookCommand } from './send-webhook.command';
import { WebhookHandler } from 'src/integrations/webhooks/application/ports/webhook.handler';

@Injectable()
export class SendWebhookUseCase {
  private readonly logger = new Logger(SendWebhookUseCase.name);

  constructor(private readonly webhookHandler: WebhookHandler) {}

  async execute(command: SendWebhookCommand): Promise<void> {
    this.logger.log({ eventType: command.event.eventType }, 'Sending webhook');

    try {
      await this.webhookHandler.sendWebhook(command.event);
      this.logger.debug(
        { eventId: command.event.id, eventType: command.event.eventType },
        'Webhook sent successfully',
      );
    } catch (error) {
      // Log error but don't fail the main operation
      this.logger.warn(
        {
          eventId: command.event.id,
          eventType: command.event.eventType,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Webhook delivery failed, continuing with main operation',
      );
      // We intentionally don't rethrow the error to avoid failing the main business operation
    }
  }
}
