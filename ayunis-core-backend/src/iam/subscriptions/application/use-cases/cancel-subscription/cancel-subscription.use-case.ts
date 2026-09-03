import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CancelSubscriptionCommand } from './cancel-subscription.command';
import { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import {
  SubscriptionAlreadyCancelledError,
  UnexpectedSubscriptionError,
} from 'src/iam/subscriptions/application/subscription.errors';
import { GetActiveSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/get-active-subscription/get-active-subscription.use-case';
import { GetActiveSubscriptionQuery } from 'src/iam/subscriptions/application/use-cases/get-active-subscription/get-active-subscription.query';
import { ApplicationError } from 'src/common/errors/base.error';
import { SubscriptionCancelledEvent } from 'src/iam/subscriptions/application/events/subscription-cancelled.event';
import { toSubscriptionEventData } from 'src/iam/subscriptions/application/mappers/to-subscription-event-data.mapper';
import { ContextService } from 'src/common/context/services/context.service';
import { validateSubscriptionAccess } from 'src/iam/subscriptions/application/util/validate-subscription-access';
import type { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';

@Injectable()
export class CancelSubscriptionUseCase {
  private readonly logger = new Logger(CancelSubscriptionUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly getActiveSubscriptionUseCase: GetActiveSubscriptionUseCase,
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
    const result = await this.getActiveSubscriptionUseCase.execute(
      new GetActiveSubscriptionQuery({
        orgId: command.orgId,
        requestingUserId: command.requestingUserId,
      }),
    );
    return result.subscription;
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
    this.emitCancelledEvent(command.orgId, subscription);
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
