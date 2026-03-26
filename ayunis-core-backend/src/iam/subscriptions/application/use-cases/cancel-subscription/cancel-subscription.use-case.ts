import { Injectable, Logger } from '@nestjs/common';
import { CancelSubscriptionCommand } from './cancel-subscription.command';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import {
  SubscriptionNotFoundError,
  SubscriptionAlreadyCancelledError,
  UnexpectedSubscriptionError,
} from '../../subscription.errors';
import { GetActiveSubscriptionUseCase } from '../get-active-subscription/get-active-subscription.use-case';
import { GetActiveSubscriptionQuery } from '../get-active-subscription/get-active-subscription.query';
import { ApplicationError } from 'src/common/errors/base.error';
import { SendWebhookUseCase } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.use-case';
import { SendWebhookCommand } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.command';
import { SubscriptionCancelledWebhookEvent } from 'src/common/webhooks/domain/webhook-events/subscription-cancelled.webhook-event';
import { toSubscriptionWebhookPayload } from '../../mappers/subscription-webhook-payload.mapper';
import { ContextService } from 'src/common/context/services/context.service';
import { validateSubscriptionAccess } from '../../util/validate-subscription-access';

@Injectable()
export class CancelSubscriptionUseCase {
  private readonly logger = new Logger(CancelSubscriptionUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly getActiveSubscriptionUseCase: GetActiveSubscriptionUseCase,
    private readonly sendWebhookUseCase: SendWebhookUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: CancelSubscriptionCommand): Promise<void> {
    this.logger.log('Cancelling subscription', {
      orgId: command.orgId,
      requestingUserId: command.requestingUserId,
    });

    try {
      validateSubscriptionAccess(
        this.contextService,
        command.requestingUserId,
        command.orgId,
      );

      this.logger.debug('Finding subscription');
      const result = await this.getActiveSubscriptionUseCase.execute(
        new GetActiveSubscriptionQuery({
          orgId: command.orgId,
          requestingUserId: command.requestingUserId,
          includeScheduled: true,
        }),
      );
      if (!result) {
        this.logger.warn('Subscription not found', {
          orgId: command.orgId,
        });
        throw new SubscriptionNotFoundError(command.orgId);
      }
      const subscription = result.subscription;

      this.logger.debug('Checking if subscription is already cancelled');
      if (subscription.cancelledAt) {
        this.logger.warn('Subscription already cancelled', {
          orgId: command.orgId,
          cancelledAt: subscription.cancelledAt,
        });
        throw new SubscriptionAlreadyCancelledError(command.orgId);
      }

      this.logger.debug('Updating subscription to cancelled');
      subscription.cancelledAt = new Date();
      await this.subscriptionRepository.update(subscription);

      this.logger.debug('Subscription cancelled successfully', {
        subscriptionId: subscription.id,
        orgId: command.orgId,
        cancelledAt: subscription.cancelledAt,
      });

      // Send webhook asynchronously (don't block the main operation)
      void this.sendWebhookUseCase.execute(
        new SendWebhookCommand(
          new SubscriptionCancelledWebhookEvent(
            toSubscriptionWebhookPayload(subscription),
          ),
        ),
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Subscription cancellation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: command.orgId,
        requestingUserId: command.requestingUserId,
      });
      throw new UnexpectedSubscriptionError('Unexpected error');
    }
  }
}
