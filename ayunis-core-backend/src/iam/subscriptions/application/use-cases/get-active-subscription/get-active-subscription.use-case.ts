import { Injectable, Logger } from '@nestjs/common';
import { GetActiveSubscriptionQuery } from './get-active-subscription.query';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { IsFromOrgUseCase } from 'src/iam/users/application/use-cases/is-from-org/is-from-org.use-case';
import { IsFromOrgQuery } from 'src/iam/users/application/use-cases/is-from-org/is-from-org.query';
import { GetInvitesByOrgUseCase } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import { GetInvitesByOrgQuery } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.query';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { getNextDate } from '../../util/get-date-for-anchor-and-cycle';
import {
  UnauthorizedSubscriptionAccessError,
  SubscriptionNotFoundError,
  MultipleActiveSubscriptionsError,
} from '../../subscription.errors';
import { isActive } from '../../util/is-active';
import { ApplicationError } from 'src/common/errors/base.error';
import { FindUsersByOrgIdQuery } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.query';
import { FindUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';
import { User } from 'src/iam/users/domain/user.entity';

@Injectable()
export class GetActiveSubscriptionUseCase {
  private readonly logger = new Logger(GetActiveSubscriptionUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly isFromOrgUseCase: IsFromOrgUseCase,
    private readonly getInvitesByOrgUseCase: GetInvitesByOrgUseCase,
    private readonly findUsersByOrgIdUseCase: FindUsersByOrgIdUseCase,
  ) {}

  async execute(query: GetActiveSubscriptionQuery): Promise<{
    subscription: Subscription;
    availableSeats: number;
    nextRenewalDate: Date;
  } | null> {
    this.logger.log('Getting subscription', {
      orgId: query.orgId,
      requestingUserId: query.requestingUserId,
    });

    try {
      this.logger.debug('Checking if user is from organization');
      const isFromOrg = await this.isFromOrgUseCase.execute(
        new IsFromOrgQuery({
          userId: query.requestingUserId,
          orgId: query.orgId,
        }),
      );
      if (!isFromOrg) {
        this.logger.warn('Unauthorized subscription access attempt', {
          userId: query.requestingUserId,
          orgId: query.orgId,
        });
        throw new UnauthorizedSubscriptionAccessError(
          query.requestingUserId,
          query.orgId,
        );
      }

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

      const [invites, users] = await Promise.all([
        this.getInvitesByOrgUseCase.execute(
          new GetInvitesByOrgQuery({
            orgId: query.orgId,
            requestingUserId: query.requestingUserId,
            onlyOpen: true,
          }),
        ),
        this.findUsersByOrgIdUseCase.execute(
          new FindUsersByOrgIdQuery(query.orgId),
        ),
      ]);

      const availableSeats = this.getAvailableSeats(
        subscription,
        invites,
        users,
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

  private getAvailableSeats(
    subscription: Subscription,
    invites: Invite[],
    users: User[],
  ): number {
    return subscription.noOfSeats - invites.length - users.length;
  }

  private getNextRenewalDate(subscription: Subscription): Date {
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
}
