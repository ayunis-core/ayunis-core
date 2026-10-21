import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { PendingDomainEvent } from 'src/common/events/pending-domain-event';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedWebhookError } from 'src/integrations/webhooks/application/errors/webhook.errors';
import { WebhookHandler } from 'src/integrations/webhooks/application/ports/webhook.handler';
import { mapBillingEvent } from 'src/integrations/webhooks/application/mappers/billing-event.mapper';

@Injectable()
export class DeliverBillingWebhookUseCase {
  private readonly logger = new Logger(DeliverBillingWebhookUseCase.name);
  constructor(private readonly handler: WebhookHandler) {}

  @HandleUnexpectedErrors(UnexpectedWebhookError)
  async execute(command: {
    id: UUID;
    createdAt: Date;
    pending: PendingDomainEvent;
  }): Promise<void> {
    this.logger.log(
      { eventId: command.id, eventName: command.pending.name },
      'Delivering persisted billing webhook',
    );
    const event = mapBillingEvent(command.pending);
    Object.defineProperties(event, {
      id: { value: command.id },
      timestamp: { value: command.createdAt },
    });
    await this.handler.sendWebhook(event);
  }
}
