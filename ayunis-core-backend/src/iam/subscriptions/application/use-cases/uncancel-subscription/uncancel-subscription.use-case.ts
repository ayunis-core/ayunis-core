import { Injectable, Logger } from '@nestjs/common';
import { UncancelSubscriptionCommand } from './uncancel-subscription.command';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { IsFromOrgUseCase } from 'src/iam/users/application/use-cases/is-from-org/is-from-org.use-case';
import { IsFromOrgQuery } from 'src/iam/users/application/use-cases/is-from-org/is-from-org.query';
import {
  UnauthorizedSubscriptionAccessError,
  SubscriptionNotFoundError,
  SubscriptionNotCancelledError,
  SubscriptionUpdateFailedError,
  SubscriptionError,
} from '../../subscription.errors';

@Injectable()
export class UncancelSubscriptionUseCase {
  private readonly logger = new Logger(UncancelSubscriptionUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly isFromOrgUseCase: IsFromOrgUseCase,
  ) {}

  async execute(command: UncancelSubscriptionCommand): Promise<void> {
    this.logger.log('Uncancelling subscription', {
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

      this.logger.debug('Checking if subscription is cancelled');
      if (!subscription.cancelledAt) {
        this.logger.warn('Subscription is not cancelled', {
          orgId: command.orgId,
        });
        throw new SubscriptionNotCancelledError(command.orgId);
      }

      this.logger.debug('Updating subscription to uncancelled');
      subscription.cancelledAt = null;
      await this.subscriptionRepository.update(subscription);

      this.logger.debug('Subscription uncancelled successfully', {
        subscriptionId: subscription.id,
        orgId: command.orgId,
      });
    } catch (error) {
      if (error instanceof SubscriptionError) {
        // Already logged and properly typed error, just rethrow
        throw error;
      }
      this.logger.error('Subscription uncancellation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: command.orgId,
        requestingUserId: command.requestingUserId,
      });
      throw new SubscriptionUpdateFailedError(
        'Unexpected error during subscription uncancellation',
      );
    }
  }
}
