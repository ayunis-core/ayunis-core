import { Injectable, Logger } from '@nestjs/common';
import { CancelSubscriptionCommand } from './cancel-subscription.command';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { IsFromOrgUseCase } from 'src/iam/users/application/use-cases/is-from-org/is-from-org.use-case';
import { IsFromOrgQuery } from 'src/iam/users/application/use-cases/is-from-org/is-from-org.query';
import {
  UnauthorizedSubscriptionAccessError,
  SubscriptionNotFoundError,
  SubscriptionAlreadyCancelledError,
  SubscriptionUpdateFailedError,
  SubscriptionError,
} from '../../subscription.errors';

@Injectable()
export class CancelSubscriptionUseCase {
  private readonly logger = new Logger(CancelSubscriptionUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly isFromOrgUseCase: IsFromOrgUseCase,
  ) {}

  async execute(command: CancelSubscriptionCommand): Promise<void> {
    this.logger.log('Cancelling subscription', {
      orgId: command.orgId,
      requestingUserId: command.requestingUserId,
    });

    try {
      this.logger.debug('Checking if user is from organization');
      const isFromOrg = await this.isFromOrgUseCase.execute(
        new IsFromOrgQuery({
          userId: command.requestingUserId,
          orgId: command.orgId,
        }),
      );
      if (!isFromOrg) {
        this.logger.warn('Unauthorized subscription access attempt', {
          userId: command.requestingUserId,
          orgId: command.orgId,
        });
        throw new UnauthorizedSubscriptionAccessError(
          command.requestingUserId,
          command.orgId,
        );
      }

      this.logger.debug('Finding subscription');
      const subscription = await this.subscriptionRepository.findByOrgId(
        command.orgId,
      );
      if (!subscription) {
        this.logger.warn('Subscription not found', {
          orgId: command.orgId,
        });
        throw new SubscriptionNotFoundError(command.orgId);
      }

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
    } catch (error) {
      if (error instanceof SubscriptionError) {
        // Already logged and properly typed error, just rethrow
        throw error;
      }
      this.logger.error('Subscription cancellation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: command.orgId,
        requestingUserId: command.requestingUserId,
      });
      throw new SubscriptionUpdateFailedError(
        'Unexpected error during subscription cancellation',
      );
    }
  }
}
