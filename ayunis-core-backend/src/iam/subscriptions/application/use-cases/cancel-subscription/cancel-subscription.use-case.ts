import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CancelSubscriptionCommand } from './cancel-subscription.command';
import { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import {
  SubscriptionAlreadyCancelledError,
  UnexpectedSubscriptionError,
} from 'src/iam/subscriptions/application/subscription.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { SubscriptionCancelledEvent } from 'src/iam/subscriptions/application/events/subscription-cancelled.event';
import { toSubscriptionEventData } from 'src/iam/subscriptions/application/mappers/to-subscription-event-data.mapper';
import { ContextService } from 'src/common/context/services/context.service';
import { validateSubscriptionAccess } from 'src/iam/subscriptions/application/util/validate-subscription-access';
import { isActive } from 'src/iam/subscriptions/application/util/is-active';
import type { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { findManageableSubscription } from 'src/iam/subscriptions/application/util/find-manageable-subscription';

@Injectable()
export class CancelSubscriptionUseCase {
  private readonly logger = new Logger(CancelSubscriptionUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: CancelSubscriptionCommand): Promise<void> {
    this.logger.log(
      { orgId: command.orgId, requestingUserId: command.requestingUserId },
      'Cancelling subscription',
    );
    try {
      validateSubscriptionAccess(
        this.contextService,
        command.requestingUserId,
        command.orgId,
      );
      const subscription = await this.findSubscription(command);
      await this.cancelSubscription(command, subscription);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        {
          err: error as Error,
          orgId: command.orgId,
          requestingUserId: command.requestingUserId,
        },
        'Subscription cancellation failed',
      );
      throw new UnexpectedSubscriptionError('Unexpected error');
    }
  }

  private async findSubscription(
    command: CancelSubscriptionCommand,
  ): Promise<Subscription> {
    this.logger.debug('Finding subscription');
    return findManageableSubscription(
      this.subscriptionRepository,
      command.orgId,
    );
  }

  private async cancelSubscription(
    command: CancelSubscriptionCommand,
    subscription: Subscription,
  ): Promise<void> {
    this.logger.debug('Checking if subscription is already cancelled');
    if (subscription.cancelledAt) {
      this.logger.warn(
        { orgId: command.orgId, cancelledAt: subscription.cancelledAt },
        'Subscription already cancelled',
      );
      throw new SubscriptionAlreadyCancelledError(command.orgId);
    }
    // Captured before the write, because cancelling flips isActive for a
    // usage-based subscription.
    const wasServing = isActive(subscription);
    subscription.cancelledAt = new Date();
    await this.subscriptionRepository.update(subscription);
    this.logger.debug(
      {
        subscriptionId: subscription.id,
        orgId: command.orgId,
        cancelledAt: subscription.cancelledAt,
      },
      'Subscription cancelled successfully',
    );
    // A subscription that never started served nobody, so nothing downstream
    // ended: listeners tear down entitlements (credit limits) for the whole
    // org, which would strip a still-serving subscription's limits.
    if (wasServing) {
      this.emitCancelledEvent(command.orgId, subscription);
    }
  }

  private emitCancelledEvent(
    orgId: CancelSubscriptionCommand['orgId'],
    subscription: Subscription,
  ): void {
    this.eventEmitter
      .emitAsync(
        SubscriptionCancelledEvent.EVENT_NAME,
        new SubscriptionCancelledEvent(
          orgId,
          toSubscriptionEventData(subscription),
        ),
      )
      .catch((err: unknown) => {
        this.logger.error(
          { err: err as Error, orgId },
          'Failed to emit SubscriptionCancelledEvent',
        );
      });
  }
}
