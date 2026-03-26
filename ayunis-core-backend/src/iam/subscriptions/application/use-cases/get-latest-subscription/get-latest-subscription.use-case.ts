import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { GetLatestSubscriptionQuery } from './get-latest-subscription.query';
import { SubscriptionRepository } from '../../ports/subscription.repository';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { isSeatBased } from 'src/iam/subscriptions/domain/subscription-type-guards';
import { GetInvitesByOrgUseCase } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import { GetInvitesByOrgQuery } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.query';
import { FindUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';
import { FindUsersByOrgIdQuery } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.query';
import { getNextDate } from '../../util/get-date-for-anchor-and-cycle';
import {
  SubscriptionNotFoundError,
  UnexpectedSubscriptionError,
} from '../../subscription.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { validateSubscriptionAccess } from '../../util/validate-subscription-access';

@Injectable()
export class GetLatestSubscriptionUseCase {
  private readonly logger = new Logger(GetLatestSubscriptionUseCase.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly getInvitesByOrgUseCase: GetInvitesByOrgUseCase,
    private readonly findUsersByOrgIdUseCase: FindUsersByOrgIdUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(query: GetLatestSubscriptionQuery): Promise<{
    subscription: Subscription;
    availableSeats: number | null;
    nextRenewalDate: Date;
  }> {
    this.logger.log('Getting latest subscription', {
      orgId: query.orgId,
      requestingUserId: query.requestingUserId,
    });

    try {
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

      const availableSeats = await this.computeAvailableSeats(
        subscription,
        query.orgId,
        query.requestingUserId,
      );
      const nextRenewalDate = this.getNextRenewalDate(subscription);

      return { subscription, availableSeats, nextRenewalDate };
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Error getting latest subscription', {
        error: error as Error,
      });
      throw new UnexpectedSubscriptionError(
        'Failed to get latest subscription',
      );
    }
  }

  private async computeAvailableSeats(
    subscription: Subscription,
    orgId: UUID,
    requestingUserId: UUID,
  ): Promise<number | null> {
    if (!isSeatBased(subscription)) {
      return null;
    }

    const [invitesResult, usersResult] = await Promise.all([
      this.getInvitesByOrgUseCase.execute(
        new GetInvitesByOrgQuery({
          orgId,
          requestingUserId,
          onlyOpen: true,
        }),
      ),
      this.findUsersByOrgIdUseCase.execute(
        new FindUsersByOrgIdQuery({
          orgId,
          pagination: { limit: 1000, offset: 0 },
        }),
      ),
    ]);

    const openInvitesCount = invitesResult.total ?? invitesResult.data.length;
    const userCount = usersResult.total ?? usersResult.data.length;
    return subscription.noOfSeats - openInvitesCount - userCount;
  }

  private getNextRenewalDate(subscription: Subscription): Date {
    const now = new Date();

    // Subscription hasn't started yet — next "renewal" is the start date
    if (now < subscription.startsAt) {
      return subscription.startsAt;
    }

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
        targetDate: now,
        cycle: subscription.renewalCycle,
      });
    }

    // Usage-based: next renewal is start of next calendar month
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  }
}
