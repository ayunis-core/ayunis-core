import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { isSeatBased } from 'src/iam/subscriptions/domain/subscription-type-guards';
import type { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import {
  SubscriptionAlreadyCancelledError,
  SubscriptionNotFoundError,
  UnexpectedSubscriptionError,
} from '../../subscription.errors';
import { validateSubscriptionAccess } from '../../util/validate-subscription-access';
import { UpdateStartDateCommand } from './update-start-date.command';

@Injectable()
export class UpdateStartDateUseCase {
  private readonly logger = new Logger(UpdateStartDateUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSubscriptionError)
  async execute(command: UpdateStartDateCommand): Promise<Subscription> {
    this.logger.log('Updating subscription start date', {
      orgId: command.orgId,
      requestingUserId: command.requestingUserId,
      startsAt: command.startsAt.toISOString(),
    });

    validateSubscriptionAccess(
      this.contextService,
      command.requestingUserId,
      command.orgId,
    );

    const subscription = await this.subscriptionRepository.findLatestByOrgId(
      command.orgId,
    );
    if (!subscription) {
      throw new SubscriptionNotFoundError(command.orgId);
    }

    if (subscription.cancelledAt) {
      throw new SubscriptionAlreadyCancelledError(command.orgId);
    }

    return await this.subscriptionRepository.updateStartDate({
      subscriptionId: subscription.id,
      startsAt: command.startsAt,
      renewalCycleAnchor: isSeatBased(subscription)
        ? command.startsAt
        : undefined,
    });
  }
}
