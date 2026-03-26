import { Injectable, Logger } from '@nestjs/common';
import { GetActiveSubscriptionQuery } from './get-active-subscription.query';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { isSeatBased } from 'src/iam/subscriptions/domain/subscription-type-guards';
import { GetInvitesByOrgUseCase } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import { GetInvitesByOrgQuery } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.query';
import { getNextDate } from '../../util/get-date-for-anchor-and-cycle';
import {
  SubscriptionNotFoundError,
  MultipleActiveSubscriptionsError,
} from '../../subscription.errors';
import { isActive, isActiveOrScheduled } from '../../util/is-active';
import { ApplicationError } from 'src/common/errors/base.error';
import { FindUsersByOrgIdQuery } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.query';
import { FindUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';
import { ContextService } from 'src/common/context/services/context.service';
import { validateSubscriptionAccess } from '../../util/validate-subscription-access';

@Injectable()
export class GetActiveSubscriptionUseCase {
  private readonly logger = new Logger(GetActiveSubscriptionUseCase.name);

  constructor(
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
    this.logger.log('Getting subscription', {
      orgId: query.orgId,
      requestingUserId: query.requestingUserId,
    });

    try {
      this.logger.debug('Checking if user is from organization');
      validateSubscriptionAccess(
        this.contextService,
        query.requestingUserId,
        query.orgId,
      );

      const filterFn = query.includeScheduled ? isActiveOrScheduled : isActive;
      const subscriptions = (
        await this.subscriptionRepository.findByOrgId(query.orgId)
      ).filter(filterFn);
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

      const availableSeats = await this.computeAvailableSeats(
        subscription,
        query,
      );
      const nextRenewalDate = this.getNextRenewalDate(subscription);
      return { subscription, availableSeats, nextRenewalDate };
    } catch (error) {
      if (error instanceof ApplicationError) {
        // Already logged and properly typed error, just rethrow
        throw error;
      }
      this.logger.error('Getting subscription failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: query.orgId,
        requestingUserId: query.requestingUserId,
      });
      throw error;
    }
  }

  private async computeAvailableSeats(
    subscription: Subscription,
    query: GetActiveSubscriptionQuery,
  ): Promise<number | null> {
    if (!isSeatBased(subscription)) {
      return null;
    }
    const [invitesResult, usersResult] = await Promise.all([
      this.getInvitesByOrgUseCase.execute(
        new GetInvitesByOrgQuery({
          orgId: query.orgId,
          requestingUserId: query.requestingUserId,
          onlyOpen: true,
        }),
      ),
      this.findUsersByOrgIdUseCase.execute(
        new FindUsersByOrgIdQuery({
          orgId: query.orgId,
          pagination: { limit: 1000, offset: 0 },
        }),
      ),
    ]);

    const openInvitesCount = invitesResult.total ?? invitesResult.data.length;
    const userCount = usersResult.total ?? usersResult.data.length;
    return subscription.noOfSeats - openInvitesCount - userCount;
  }

  private getNextRenewalDate(subscription: Subscription): Date {
    if (isSeatBased(subscription)) {
      if (subscription.cancelledAt) {
        return getNextDate({
          anchorDate: subscription.renewalCycleAnchor,
          targetDate: subscription.cancelledAt,
          cycle: subscription.renewalCycle,
        });
      }
      return getNextDate({
        anchorDate: subscription.renewalCycleAnchor,
        targetDate: new Date(),
        cycle: subscription.renewalCycle,
      });
    }
    // Usage-based: next renewal is start of next calendar month
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  }
}
