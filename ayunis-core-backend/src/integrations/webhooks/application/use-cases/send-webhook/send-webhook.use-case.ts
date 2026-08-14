import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SendWebhookCommand } from './send-webhook.command';
import { WebhookHandler } from '../../ports/webhook.handler';

@Injectable()
export class SendWebhookUseCase {
  constructor(
    @InjectPinoLogger(SendWebhookUseCase.name)
    private readonly logger: PinoLogger,
    private readonly webhookHandler: WebhookHandler,
  ) {}

  async execute(command: SendWebhookCommand): Promise<void> {
    this.logger.info({ eventType: command.event.eventType }, 'Sending webhook');

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
