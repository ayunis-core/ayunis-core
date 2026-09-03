import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UpdateMonthlyCreditsCommand } from './update-monthly-credits.command';
import { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import {
  InvalidSubscriptionDataError,
  UnexpectedSubscriptionError,
  InvalidSubscriptionTypeError,
} from 'src/iam/subscriptions/application/subscription.errors';
import { isUsageBased } from 'src/iam/subscriptions/domain/subscription-type-guards';
import { GetActiveSubscriptionQuery } from 'src/iam/subscriptions/application/use-cases/get-active-subscription/get-active-subscription.query';
import { GetActiveSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/get-active-subscription/get-active-subscription.use-case';
import { ApplicationError } from 'src/common/errors/base.error';
import { SubscriptionMonthlyCreditsUpdatedEvent } from 'src/iam/subscriptions/application/events/subscription-monthly-credits-updated.event';
import { toSubscriptionEventData } from 'src/iam/subscriptions/application/mappers/to-subscription-event-data.mapper';
import { ContextService } from 'src/common/context/services/context.service';
import { validateSubscriptionAccess } from 'src/iam/subscriptions/application/util/validate-subscription-access';
import type { UsageBasedSubscription } from 'src/iam/subscriptions/domain/usage-based-subscription.entity';

@Injectable()
export class UpdateMonthlyCreditsUseCase {
  private readonly logger = new Logger(UpdateMonthlyCreditsUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly getActiveSubscriptionUseCase: GetActiveSubscriptionUseCase,
    private readonly eventEmitter: EventEmitter2,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: UpdateMonthlyCreditsCommand): Promise<void> {
    this.logger.log(
      {
        orgId: command.orgId,
        requestingUserId: command.requestingUserId,
        monthlyCredits: command.monthlyCredits,
      },
      'Updating monthly credits of subscription',
    );

    try {
      validateSubscriptionAccess(
        this.contextService,
        command.requestingUserId,
        command.orgId,
      );

      this.validateMonthlyCredits(command.monthlyCredits);
      const subscription = await this.findSubscription(command);
      const previousCredits = subscription.monthlyCredits;
      subscription.monthlyCredits = command.monthlyCredits;
      await this.subscriptionRepository.update(subscription);
      this.logger.debug(
        {
          subscriptionId: subscription.id,
          orgId: command.orgId,
          previousCredits,
          newCredits: subscription.monthlyCredits,
        },
        'Monthly credits updated successfully',
      );
      this.emitUpdatedEvent(command.orgId, subscription);
    } catch (error) {
      if (error instanceof ApplicationError) {
        // Already logged and properly typed error, just rethrow
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
          orgId: command.orgId,
          requestingUserId: command.requestingUserId,
          monthlyCredits: command.monthlyCredits,
        },
        'Updating monthly credits failed',
      );
      throw new UnexpectedSubscriptionError(
        'Unexpected error during monthly credits update',
      );
    }
  }

  private validateMonthlyCredits(monthlyCredits: number): void {
    if (monthlyCredits < 0) {
      this.logger.warn({ monthlyCredits }, 'Invalid monthly credits provided');
      throw new InvalidSubscriptionDataError(
        'Monthly credits must be 0 or greater',
      );
    }
  }

  private async findSubscription(
    command: UpdateMonthlyCreditsCommand,
  ): Promise<UsageBasedSubscription> {
    const { subscription } = await this.getActiveSubscriptionUseCase.execute(
      new GetActiveSubscriptionQuery({
        orgId: command.orgId,
        requestingUserId: command.requestingUserId,
      }),
    );
    if (!isUsageBased(subscription)) {
      throw new InvalidSubscriptionTypeError(
        'Credit updates are only allowed for usage-based subscriptions',
      );
    }
    return subscription;
  }

  private emitUpdatedEvent(
    orgId: UpdateMonthlyCreditsCommand['orgId'],
    subscription: UsageBasedSubscription,
  ): void {
    this.eventEmitter
      .emitAsync(
        SubscriptionMonthlyCreditsUpdatedEvent.EVENT_NAME,
        new SubscriptionMonthlyCreditsUpdatedEvent(
          orgId,
          toSubscriptionEventData(subscription),
        ),
      )
      .catch((err: unknown) => {
        this.logger.error(
          { err: err as Error, orgId },
          'Failed to emit SubscriptionMonthlyCreditsUpdatedEvent',
        );
      });
  }
}
