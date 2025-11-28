import { Injectable, Logger } from '@nestjs/common';
import { UncancelSubscriptionCommand } from './uncancel-subscription.command';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import {
  UnauthorizedSubscriptionAccessError,
  SubscriptionNotFoundError,
  SubscriptionNotCancelledError,
  UnexpectedSubscriptionError,
} from '../../subscription.errors';
import { GetActiveSubscriptionUseCase } from '../get-active-subscription/get-active-subscription.use-case';
import { GetActiveSubscriptionQuery } from '../get-active-subscription/get-active-subscription.query';
import { ApplicationError } from 'src/common/errors/base.error';
import { SendWebhookUseCase } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.use-case';
import { SendWebhookCommand } from 'src/common/webhooks/application/use-cases/send-webhook/send-webhook.command';
import { SubscriptionUncancelledWebhookEvent } from 'src/common/webhooks/domain/webhook-events/subscription-uncancelled.webhook-event';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { ContextService } from 'src/common/context/services/context.service';

@Injectable()
export class UncancelSubscriptionUseCase {
  private readonly logger = new Logger(UncancelSubscriptionUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly getActiveSubscriptionUseCase: GetActiveSubscriptionUseCase,
    private readonly sendWebhookUseCase: SendWebhookUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: UncancelSubscriptionCommand): Promise<void> {
    this.logger.log('Uncancelling subscription', {
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

      this.logger.debug('Checking if subscription is cancelled');
      if (!subscription.cancelledAt) {
        this.logger.warn('Subscription is not cancelled', {
          orgId: command.orgId,
        });
        throw new SubscriptionNotCancelledError(command.orgId);
      }

      subscription.cancelledAt = null;

      this.logger.debug('Updating subscription to uncancelled');
      await this.subscriptionRepository.update(subscription);

      this.logger.debug('Subscription uncancelled successfully', {
        subscriptionId: subscription.id,
        orgId: command.orgId,
      });

      // Send webhook asynchronously (don't block the main operation)
      void this.sendWebhookUseCase.execute(
        new SendWebhookCommand(
          new SubscriptionUncancelledWebhookEvent(subscription),
        ),
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        // Already logged and properly typed error, just rethrow
        throw error;
      }
      this.logger.error('Subscription uncancellation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: command.orgId,
        requestingUserId: command.requestingUserId,
      });
      throw new UnexpectedSubscriptionError('Unexpected error');
    }
  }
}
