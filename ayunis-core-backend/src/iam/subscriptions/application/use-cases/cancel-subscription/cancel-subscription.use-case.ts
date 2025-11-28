import { Injectable, Logger } from '@nestjs/common';
import { CancelSubscriptionCommand } from './cancel-subscription.command';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import {
  UnauthorizedSubscriptionAccessError,
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
import { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

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
      const systemRole = this.contextService.get('systemRole');
      const orgRole = this.contextService.get('role');
      const orgId = this.contextService.get('orgId');
      const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
      const isOrgAdmin = orgRole === UserRole.ADMIN && orgId === command.orgId;
      if (!isSuperAdmin && !isOrgAdmin) {
        throw new UnauthorizedSubscriptionAccessError(
          command.requestingUserId,
          command.orgId,
        );
      }

      this.logger.debug('Finding subscription');
      const result = await this.getActiveSubscriptionUseCase.execute(
        new GetActiveSubscriptionQuery({
          orgId: command.orgId,
          requestingUserId: command.requestingUserId,
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
          new SubscriptionCancelledWebhookEvent(subscription),
        ),
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        // Already logged and properly typed error, just rethrow
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
