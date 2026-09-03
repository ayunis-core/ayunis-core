import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UncancelSubscriptionCommand } from './uncancel-subscription.command';
import { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import {
  SubscriptionNotFoundError,
  SubscriptionNotCancelledError,
  SubscriptionExpiredError,
  UnexpectedSubscriptionError,
} from 'src/iam/subscriptions/application/subscription.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { SubscriptionUncancelledEvent } from 'src/iam/subscriptions/application/events/subscription-uncancelled.event';
import { toSubscriptionEventData } from 'src/iam/subscriptions/application/mappers/to-subscription-event-data.mapper';
import { ContextService } from 'src/common/context/services/context.service';
import { validateSubscriptionAccess } from 'src/iam/subscriptions/application/util/validate-subscription-access';
import { isActive } from 'src/iam/subscriptions/application/util/is-active';
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
    this.logger.log(
      {
        orgId: command.orgId,
        requestingUserId: command.requestingUserId,
      },
      'Uncancelling subscription',
    );

    try {
      validateSubscriptionAccess(
        this.contextService,
        command.requestingUserId,
        command.orgId,
      );

      const subscription = await this.findSubscription(command.orgId);
      this.ensureCanUncancel(command.orgId, subscription);
      subscription.cancelledAt = null;
      await this.subscriptionRepository.update(subscription);
      this.logger.debug(
        { subscriptionId: subscription.id, orgId: command.orgId },
        'Subscription uncancelled successfully',
      );
      this.emitUncancelledEvent(command.orgId, subscription);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
          orgId: command.orgId,
          requestingUserId: command.requestingUserId,
        },
        'Subscription uncancellation failed',
      );
      throw new UnexpectedSubscriptionError('Unexpected error');
    }
  }

  private async findSubscription(
    orgId: UncancelSubscriptionCommand['orgId'],
  ): Promise<Subscription> {
    this.logger.debug('Finding subscription');
    const subscription =
      await this.subscriptionRepository.findLatestByOrgId(orgId);
    if (!subscription) {
      this.logger.warn({ orgId }, 'Subscription not found');
      throw new SubscriptionNotFoundError(orgId);
    }
    return subscription;
  }

  private ensureCanUncancel(
    orgId: UncancelSubscriptionCommand['orgId'],
    subscription: Subscription,
  ): void {
    if (!subscription.cancelledAt) {
      this.logger.warn({ orgId }, 'Subscription is not cancelled');
      throw new SubscriptionNotCancelledError(orgId);
    }
    if (!this.canUncancel(subscription)) {
      this.logger.warn(
        { orgId },
        'Subscription has expired and cannot be uncancelled',
      );
      throw new SubscriptionExpiredError(orgId);
    }
  }

  private emitUncancelledEvent(
    orgId: UncancelSubscriptionCommand['orgId'],
    subscription: Subscription,
  ): void {
    this.eventEmitter
      .emitAsync(
        SubscriptionUncancelledEvent.EVENT_NAME,
        new SubscriptionUncancelledEvent(
          orgId,
          toSubscriptionEventData(subscription),
        ),
      )
      .catch((err: unknown) => {
        this.logger.error(
          { err: err as Error, orgId },
          'Failed to emit SubscriptionUncancelledEvent',
        );
      });
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
