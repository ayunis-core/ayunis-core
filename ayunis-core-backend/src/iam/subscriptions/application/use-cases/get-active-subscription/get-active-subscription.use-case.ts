import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { GetActiveSubscriptionQuery } from './get-active-subscription.query';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { GetInvitesByOrgUseCase } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import {
  SubscriptionNotFoundError,
  MultipleActiveSubscriptionsError,
} from '../../subscription.errors';
import { isActive } from '../../util/is-active';
import { ApplicationError } from 'src/common/errors/base.error';
import { FindUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { validateSubscriptionAccess } from '../../util/validate-subscription-access';
import { computeAvailableSeats } from '../../util/compute-available-seats';
import { getNextRenewalDate } from '../../util/get-next-renewal-date';

@Injectable()
export class GetActiveSubscriptionUseCase {
  constructor(
    @InjectPinoLogger(GetActiveSubscriptionUseCase.name)
    private readonly logger: PinoLogger,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly getInvitesByOrgUseCase: GetInvitesByOrgUseCase,
    private readonly findUsersByOrgIdUseCase: FindUsersByOrgIdUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: GetActiveSubscriptionQuery): Promise<{
    subscription: Subscription;
    availableSeats: number | null;
    nextRenewalDate: Date;
  }> {
    this.logger.info(
      {
        orgId: query.orgId,
        requestingUserId: query.requestingUserId,
      },
      'Getting subscription',
    );

    try {
      this.logger.debug('Checking if user is from organization');
      validateSubscriptionAccess(
        this.contextService,
        query.requestingUserId,
        query.orgId,
      );

      const subscription = await this.findActiveSubscription(query.orgId);

      const availableSeats = await computeAvailableSeats(
        subscription,
        query.orgId,
        query.requestingUserId,
        this.getInvitesByOrgUseCase,
        this.findUsersByOrgIdUseCase,
      );
      const nextRenewalDate = getNextRenewalDate(subscription);
      return { subscription, availableSeats, nextRenewalDate };
    } catch (error) {
      if (error instanceof ApplicationError) {
        // Already logged and properly typed error, just rethrow
        throw error;
      }
      this.logger.error(
        {
          err: error as Error,
          orgId: query.orgId,
          requestingUserId: query.requestingUserId,
        },
        'Getting subscription failed',
      );
      throw error;
    }
  }

  private async findActiveSubscription(
    orgId: GetActiveSubscriptionQuery['orgId'],
  ): Promise<Subscription> {
    const subscriptions = (
      await this.subscriptionRepository.findByOrgId(orgId)
    ).filter(isActive);
    if (subscriptions.length === 0) {
      this.logger.warn({ orgId }, 'Subscription not found');
      throw new SubscriptionNotFoundError(orgId);
    }
    if (subscriptions.length > 1) {
      this.logger.warn({ orgId }, 'Multiple active subscriptions found');
      throw new MultipleActiveSubscriptionsError(orgId);
    }
    return subscriptions[0];
  }
}
