import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { SeatBasedSubscription } from 'src/iam/subscriptions/domain/seat-based-subscription.entity';
import { UsageBasedSubscription } from 'src/iam/subscriptions/domain/usage-based-subscription.entity';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import {
  InvalidSubscriptionDataError,
  TooManyUsedSeatsError,
} from '../subscription.errors';
import type { User } from 'src/iam/users/domain/user.entity';
import { GetInvitesByOrgQuery } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.query';
import { FindUsersByOrgIdQuery } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.query';
import { GetInvitesByOrgUseCase } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import { FindUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/find-users-by-org-id/find-users-by-org-id.use-case';

/**
 * The data required to construct a brand-new subscription. Shared by the
 * create and change (cancel/delete + recreate) flows — both their commands
 * satisfy this shape structurally.
 */
export interface BuildSubscriptionParams {
  orgId: UUID;
  requestingUserId: UUID;
  type: SubscriptionType;
  noOfSeats?: number;
  monthlyCredits?: number;
  companyName: string;
  subText?: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  vatNumber?: string;
  startsAt?: Date;
}

/**
 * Builds and validates new {@link Subscription} domain objects from raw command
 * data. Extracted from CreateSubscriptionUseCase so the change-subscription flow
 * can construct the replacement subscription with identical validation rules
 * (seat count vs used seats, price configuration, positive monthly credits).
 *
 * It does NOT enforce the "at most one non-cancelled subscription" invariant —
 * that belongs to the caller, since create and change differ on it.
 */
@Injectable()
export class SubscriptionFactory {
  private readonly logger = new Logger(SubscriptionFactory.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly getInvitesByOrgUseCase: GetInvitesByOrgUseCase,
    private readonly findUsersByOrgIdUseCase: FindUsersByOrgIdUseCase,
  ) {}

  async build(params: BuildSubscriptionParams): Promise<Subscription> {
    return params.type === SubscriptionType.USAGE_BASED
      ? this.buildUsageBased(params)
      : this.buildSeatBased(params);
  }

  private buildUsageBased(
    params: BuildSubscriptionParams,
  ): UsageBasedSubscription {
    if (!params.monthlyCredits || params.monthlyCredits <= 0) {
      throw new InvalidSubscriptionDataError(
        'Monthly credits must be greater than 0 for usage-based subscriptions',
      );
    }

    this.logger.log('Building usage-based subscription', {
      orgId: params.orgId,
      monthlyCredits: params.monthlyCredits,
    });

    return new UsageBasedSubscription({
      orgId: params.orgId,
      monthlyCredits: params.monthlyCredits,
      startsAt: params.startsAt,
      billingInfo: this.buildBillingInfo(params),
    });
  }

  private async buildSeatBased(
    params: BuildSubscriptionParams,
  ): Promise<SeatBasedSubscription> {
    const noOfSeats = params.noOfSeats ?? 1;

    this.logger.log('Building seat-based subscription', {
      orgId: params.orgId,
      noOfSeats,
    });

    if (noOfSeats <= 0) {
      throw new InvalidSubscriptionDataError(
        'Number of seats must be greater than 0',
      );
    }

    await this.validateSeatCount(
      params.orgId,
      params.requestingUserId,
      noOfSeats,
    );

    const pricePerSeat = this.configService.get<number>(
      'subscriptions.pricePerSeatYearly',
    );
    if (!pricePerSeat) {
      throw new InvalidSubscriptionDataError('Price per seat not configured');
    }

    const startsAt = params.startsAt ?? new Date();
    return new SeatBasedSubscription({
      orgId: params.orgId,
      noOfSeats,
      renewalCycle: RenewalCycle.YEARLY,
      pricePerSeat,
      renewalCycleAnchor: startsAt,
      startsAt,
      billingInfo: this.buildBillingInfo(params),
    });
  }

  private async validateSeatCount(
    orgId: UUID,
    requestingUserId: User['id'],
    noOfSeats: number,
  ): Promise<void> {
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
    if (
      openInvitesCount + (usersResult.total ?? usersResult.data.length) >
      noOfSeats
    ) {
      this.logger.warn('Too many used seats', {
        orgId,
        openInvites: openInvitesCount,
      });
      throw new TooManyUsedSeatsError({
        orgId,
        openInvites: openInvitesCount,
      });
    }
  }

  private buildBillingInfo(
    params: BuildSubscriptionParams,
  ): SubscriptionBillingInfo {
    return new SubscriptionBillingInfo({
      companyName: params.companyName,
      subText: params.subText,
      street: params.street,
      houseNumber: params.houseNumber,
      postalCode: params.postalCode,
      city: params.city,
      country: params.country,
      vatNumber: params.vatNumber,
    });
  }
}
