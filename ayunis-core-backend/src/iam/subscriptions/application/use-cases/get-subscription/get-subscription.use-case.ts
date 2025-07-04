import { Injectable, Logger } from '@nestjs/common';
import { GetSubscriptionQuery } from './get-subscription.query';
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
  SubscriptionError,
} from '../../subscription.errors';

@Injectable()
export class GetSubscriptionUseCase {
  private readonly logger = new Logger(GetSubscriptionUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly isFromOrgUseCase: IsFromOrgUseCase,
    private readonly getInvitesByOrgUseCase: GetInvitesByOrgUseCase,
  ) {}

  async execute(query: GetSubscriptionQuery): Promise<{
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

      this.logger.debug('Finding subscription');
      const subscription = await this.subscriptionRepository.findByOrgId(
        query.orgId,
      );
      if (!subscription) {
        this.logger.warn('Subscription not found', {
          orgId: query.orgId,
        });
        throw new SubscriptionNotFoundError(query.orgId);
      }

      this.logger.debug('Getting invites for organization');
      const invites = await this.getInvitesByOrgUseCase.execute(
        new GetInvitesByOrgQuery({
          orgId: query.orgId,
          requestingUserId: query.requestingUserId,
        }),
      );

      const availableSeats = this.getAvailableSeats(subscription, invites);
      const nextRenewalDate = this.getNextRenewalDate(subscription);

      this.logger.debug('Subscription retrieved successfully', {
        subscriptionId: subscription.id,
        orgId: query.orgId,
        availableSeats,
        nextRenewalDate,
      });

      return { subscription, availableSeats, nextRenewalDate };
    } catch (error) {
      if (error instanceof SubscriptionError) {
        // Already logged and properly typed error, just rethrow
        throw error;
      }
      this.logger.error('Getting subscription failed', {
        error,
        orgId: query.orgId,
        requestingUserId: query.requestingUserId,
      });
      throw error;
    }
  }

  private getAvailableSeats(
    subscription: Subscription,
    invites: Invite[],
  ): number {
    return subscription.noOfSeats - invites.length;
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
