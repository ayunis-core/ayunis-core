import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedWebhookError } from 'src/integrations/webhooks/application/errors/webhook.errors';
import { SendWebhookCommand } from './send-webhook.command';
import { WebhookHandler } from 'src/integrations/webhooks/application/ports/webhook.handler';

@Injectable()
export class SendWebhookUseCase {
  private readonly logger = new Logger(SendWebhookUseCase.name);

  constructor(private readonly webhookHandler: WebhookHandler) {}

  @HandleUnexpectedErrors(UnexpectedWebhookError)
  async execute(command: SendWebhookCommand): Promise<void> {
    try {
      await this.executeOrThrow(command);
    } catch (error) {
      if (command.propagateFailure) throw error;
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

  async executeOrThrow(command: SendWebhookCommand): Promise<void> {
    this.logger.log({ eventType: command.event.eventType }, 'Sending webhook');
    await this.webhookHandler.sendWebhook(command.event);
    this.logger.debug(
      { eventId: command.event.id, eventType: command.event.eventType },
      'Webhook sent successfully',
    );
  }
}
