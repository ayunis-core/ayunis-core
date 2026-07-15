import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedSubscriptionError } from 'src/iam/subscriptions/application/subscription.errors';
import { Injectable, Logger } from '@nestjs/common';
import { GetActiveSubscriptionQuery } from './get-active-subscription.query';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { GetInvitesByOrgUseCase } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import {
  SubscriptionNotFoundError,
  MultipleActiveSubscriptionsError,
} from '../../subscription.errors';
import { isActive } from '../../util/is-active';
import { FindUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { validateSubscriptionAccess } from '../../util/validate-subscription-access';
import { computeAvailableSeats } from '../../util/compute-available-seats';
import { getNextRenewalDate } from '../../util/get-next-renewal-date';

@Injectable()
export class GetActiveSubscriptionUseCase {
  private readonly logger = new Logger(GetActiveSubscriptionUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly getInvitesByOrgUseCase: GetInvitesByOrgUseCase,
    private readonly findUsersByOrgIdUseCase: FindUsersByOrgIdUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSubscriptionError)
  async execute(query: GetActiveSubscriptionQuery): Promise<{
    subscription: Subscription;
    availableSeats: number | null;
    nextRenewalDate: Date;
  }> {
    this.logger.log('Getting subscription', {
      orgId: query.orgId,
      requestingUserId: query.requestingUserId,
    });

    this.logger.debug('Checking if user is from organization');
    validateSubscriptionAccess(
      this.contextService,
      query.requestingUserId,
      query.orgId,
    );

    const subscriptions = (
      await this.subscriptionRepository.findByOrgId(query.orgId)
    ).filter(isActive);
    if (subscriptions.length === 0) {
      this.logger.warn('Subscription not found', {
        orgId: query.orgId,
      });
      throw new SubscriptionNotFoundError(query.orgId);
    }
    if (subscriptions.length > 1) {
      this.logger.warn('Multiple active subscriptions found', {
        orgId: query.orgId,
      });
      throw new MultipleActiveSubscriptionsError(query.orgId);
    }

    const subscription = subscriptions[0];

    const availableSeats = await computeAvailableSeats(
      subscription,
      query.orgId,
      query.requestingUserId,
      this.getInvitesByOrgUseCase,
      this.findUsersByOrgIdUseCase,
    );
    const nextRenewalDate = getNextRenewalDate(subscription);
    return { subscription, availableSeats, nextRenewalDate };
  }
}
