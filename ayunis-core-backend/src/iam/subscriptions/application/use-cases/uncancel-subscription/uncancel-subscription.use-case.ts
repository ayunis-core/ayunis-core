import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UncancelSubscriptionCommand } from './uncancel-subscription.command';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import {
  SubscriptionNotFoundError,
  SubscriptionNotCancelledError,
  SubscriptionExpiredError,
  UnexpectedSubscriptionError,
} from '../../subscription.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { SubscriptionUncancelledEvent } from '../../events/subscription-uncancelled.event';
import { toSubscriptionEventData } from '../../mappers/to-subscription-event-data.mapper';
import { ContextService } from 'src/common/context/services/context.service';
import { validateSubscriptionAccess } from '../../util/validate-subscription-access';
import { isActive } from '../../util/is-active';
import { isUsageBased } from 'src/iam/subscriptions/domain/subscription-type-guards';
import type { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';

@Injectable()
export class UncancelSubscriptionUseCase {
  private readonly logger = new Logger(UncancelSubscriptionUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: UncancelSubscriptionCommand): Promise<void> {
    this.logger.log('Uncancelling subscription', {
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
      const subscription = await this.subscriptionRepository.findLatestByOrgId(
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

      this.logger.debug('Checking if subscription can still be uncancelled');
      if (!this.canUncancel(subscription)) {
        this.logger.warn('Subscription has expired and cannot be uncancelled', {
          orgId: command.orgId,
        });
        throw new SubscriptionExpiredError(command.orgId);
      }

      subscription.cancelledAt = null;

      this.logger.debug('Updating subscription to uncancelled');
      await this.subscriptionRepository.update(subscription);

      this.logger.debug('Subscription uncancelled successfully', {
        subscriptionId: subscription.id,
        orgId: command.orgId,
      });

      this.eventEmitter
        .emitAsync(
          SubscriptionUncancelledEvent.EVENT_NAME,
          new SubscriptionUncancelledEvent(
            command.orgId,
            toSubscriptionEventData(subscription),
          ),
        )
        .catch((err: unknown) => {
          this.logger.error('Failed to emit SubscriptionUncancelledEvent', {
            error: err instanceof Error ? err.message : 'Unknown error',
            orgId: command.orgId,
          });
        });
    } catch (error) {
      if (error instanceof ApplicationError) {
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

  /**
   * Seat-based: can uncancel while still within the billing period (isActive).
   * Usage-based: can uncancel if cancelled in the current calendar month.
   */
  private canUncancel(subscription: Subscription): boolean {
    if (isUsageBased(subscription)) {
      const now = new Date();
      const cancelledAt = subscription.cancelledAt!;
      return (
        cancelledAt.getUTCFullYear() === now.getUTCFullYear() &&
        cancelledAt.getUTCMonth() === now.getUTCMonth()
      );
    }

    return isActive(subscription);
  }
}
