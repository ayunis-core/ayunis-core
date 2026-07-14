import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { GetLatestSubscriptionQuery } from './get-latest-subscription.query';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { GetInvitesByOrgUseCase } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import { FindUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';
import {
  SubscriptionNotFoundError,
  UnexpectedSubscriptionError,
} from '../../subscription.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { validateSubscriptionAccess } from '../../util/validate-subscription-access';
import { computeAvailableSeats } from '../../util/compute-available-seats';
import { getNextRenewalDate } from '../../util/get-next-renewal-date';

@Injectable()
export class GetLatestSubscriptionUseCase {
  private readonly logger = new Logger(GetLatestSubscriptionUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly getInvitesByOrgUseCase: GetInvitesByOrgUseCase,
    private readonly findUsersByOrgIdUseCase: FindUsersByOrgIdUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSubscriptionError)
  async execute(query: GetLatestSubscriptionQuery): Promise<{
    subscription: Subscription;
    availableSeats: number | null;
    nextRenewalDate: Date;
  }> {
    this.logger.log('Getting latest subscription', {
      orgId: query.orgId,
      requestingUserId: query.requestingUserId,
    });

    validateSubscriptionAccess(
      this.contextService,
      query.requestingUserId,
      query.orgId,
    );

    const subscription = await this.subscriptionRepository.findLatestByOrgId(
      query.orgId,
    );

    if (!subscription) {
      throw new SubscriptionNotFoundError(query.orgId);
    }

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
