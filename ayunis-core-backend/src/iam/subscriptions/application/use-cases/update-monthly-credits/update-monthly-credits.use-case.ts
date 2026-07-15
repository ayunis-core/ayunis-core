import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
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
import { SubscriptionMonthlyCreditsUpdatedEvent } from '../../events/subscription-monthly-credits-updated.event';
import { toSubscriptionEventData } from '../../mappers/to-subscription-event-data.mapper';
import { ContextService } from 'src/common/context/services/context.service';
import { validateSubscriptionAccess } from '../../util/validate-subscription-access';

@Injectable()
export class UpdateMonthlyCreditsUseCase {
  private readonly logger = new Logger(UpdateMonthlyCreditsUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly getActiveSubscriptionUseCase: GetActiveSubscriptionUseCase,
    private readonly eventEmitter: EventEmitter2,
    private readonly contextService: ContextService,
  ) {}

  // Credit updates coordinate access checks, persistence, and subscription rules.
  // eslint-disable-next-line max-lines-per-function
  @HandleUnexpectedErrors(UnexpectedSubscriptionError)
  async execute(command: UpdateMonthlyCreditsCommand): Promise<void> {
    this.logger.log('Updating monthly credits of subscription', {
      orgId: command.orgId,
      requestingUserId: command.requestingUserId,
      monthlyCredits: command.monthlyCredits,
    });

    validateSubscriptionAccess(
      this.contextService,
      command.requestingUserId,
      command.orgId,
    );

    this.logger.debug('Validating monthly credits');
    if (command.monthlyCredits < 0) {
      this.logger.warn('Invalid monthly credits provided', {
        monthlyCredits: command.monthlyCredits,
      });
      throw new InvalidSubscriptionDataError(
        'Monthly credits must be 0 or greater',
      );
    }

    this.logger.debug('Finding subscription');
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

    const previousCredits = subscription.monthlyCredits;
    subscription.monthlyCredits = command.monthlyCredits;
    await this.subscriptionRepository.update(subscription);

    this.logger.debug('Monthly credits updated successfully', {
      subscriptionId: subscription.id,
      orgId: command.orgId,
      previousCredits,
      newCredits: subscription.monthlyCredits,
    });

    this.eventEmitter
      .emitAsync(
        SubscriptionMonthlyCreditsUpdatedEvent.EVENT_NAME,
        new SubscriptionMonthlyCreditsUpdatedEvent(
          command.orgId,
          toSubscriptionEventData(subscription),
        ),
      )
      .catch((err: unknown) => {
        this.logger.error(
          'Failed to emit SubscriptionMonthlyCreditsUpdatedEvent',
          {
            error: err instanceof Error ? err.message : 'Unknown error',
            orgId: command.orgId,
          },
        );
      });
  }
}
