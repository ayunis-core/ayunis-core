import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UpdateMonthlyCreditsCommand } from './update-monthly-credits.command';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import {
  InvalidSubscriptionDataError,
  UnexpectedSubscriptionError,
  InvalidSubscriptionTypeError,
} from '../../subscription.errors';
import { isUsageBased } from 'src/iam/subscriptions/domain/subscription-type-guards';
import { GetActiveSubscriptionQuery } from '../get-active-subscription/get-active-subscription.query';
import { GetActiveSubscriptionUseCase } from '../get-active-subscription/get-active-subscription.use-case';
import { ApplicationError } from 'src/common/errors/base.error';
import { SubscriptionMonthlyCreditsUpdatedEvent } from '../../events/subscription-monthly-credits-updated.event';
import { toSubscriptionEventData } from '../../mappers/to-subscription-event-data.mapper';
import { ContextService } from 'src/common/context/services/context.service';
import { validateSubscriptionAccess } from '../../util/validate-subscription-access';
import type { UsageBasedSubscription } from '../../../domain/usage-based-subscription.entity';

@Injectable()
export class UpdateMonthlyCreditsUseCase {
  constructor(
    @InjectPinoLogger(UpdateMonthlyCreditsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly getActiveSubscriptionUseCase: GetActiveSubscriptionUseCase,
    private readonly eventEmitter: EventEmitter2,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: UpdateMonthlyCreditsCommand): Promise<void> {
    this.logger.info(
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
