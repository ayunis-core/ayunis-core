import { Injectable, Logger } from '@nestjs/common';
import { SendWebhookCommand } from './send-webhook.command';
import { WebhookHandler } from '../../ports/webhook.handler';

@Injectable()
export class SendWebhookUseCase {
  private readonly logger = new Logger(SendWebhookUseCase.name);

  constructor(private readonly webhookHandler: WebhookHandler) {}

  async execute(command: SendWebhookCommand): Promise<void> {
    this.logger.log('Sending webhook', {
      eventType: command.event.eventType,
    });

    try {
      await this.webhookHandler.sendWebhook(command.event);
      this.logger.debug('Webhook sent successfully', {
        eventId: command.event.id,
        eventType: command.event.eventType,
      });
    } catch (error) {
      // Log error but don't fail the main operation
      this.logger.warn(
        'Webhook delivery failed, continuing with main operation',
        {
          eventId: command.event.id,
          eventType: command.event.eventType,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );
      // We intentionally don't rethrow the error to avoid failing the main business operation
    }
  }
}
