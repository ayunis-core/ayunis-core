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
  InvalidSubscriptionAccessEndError,
  TooManyUsedSeatsError,
} from 'src/iam/subscriptions/application/subscription.errors';
import { CountPendingInvitesByOrgIdQuery } from 'src/iam/invites/application/use-cases/count-pending-invites-by-org-id/count-pending-invites-by-org-id.query';
import { CountUsersByOrgIdQuery } from 'src/iam/users/application/use-cases/count-users-by-org-id/count-users-by-org-id.query';
import { CountPendingInvitesByOrgIdUseCase } from 'src/iam/invites/application/use-cases/count-pending-invites-by-org-id/count-pending-invites-by-org-id.use-case';
import { CountUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/count-users-by-org-id/count-users-by-org-id.use-case';

/**
 * The data required to construct a brand-new subscription. Shared by the
 * create and change (cancel/delete + recreate) flows — both their commands
 * satisfy this shape structurally.
 */
export interface BuildSubscriptionParams {
  orgId: UUID;
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
  endsAt?: Date;
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
    private readonly countInvites: CountPendingInvitesByOrgIdUseCase,
    private readonly countUsers: CountUsersByOrgIdUseCase,
  ) {}

  async build(params: BuildSubscriptionParams): Promise<Subscription> {
    const subscription =
      params.type === SubscriptionType.USAGE_BASED
        ? this.buildUsageBased(params)
        : await this.buildSeatBased(params);
    const end = params.endsAt;
    if (
      end &&
      (!Number.isFinite(end.getTime()) || end <= subscription.startsAt)
    ) {
      throw new InvalidSubscriptionAccessEndError();
    }
    subscription.endsAt = end ?? null;
    subscription.originalEndsAt = end ?? null;
    return subscription;
  }

  private buildUsageBased(
    params: BuildSubscriptionParams,
  ): UsageBasedSubscription {
    if (!params.monthlyCredits || params.monthlyCredits <= 0) {
      throw new InvalidSubscriptionDataError(
        'Monthly credits must be greater than 0 for usage-based subscriptions',
      );
    }

    this.logger.log(
      {
        orgId: params.orgId,
        monthlyCredits: params.monthlyCredits,
      },
      'Building usage-based subscription',
    );

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

    this.logger.log(
      {
        orgId: params.orgId,
        noOfSeats,
      },
      'Building seat-based subscription',
    );

    if (noOfSeats <= 0) {
      throw new InvalidSubscriptionDataError(
        'Number of seats must be greater than 0',
      );
    }

    await this.validateSeatCount(params.orgId, noOfSeats);

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
    noOfSeats: number,
  ): Promise<void> {
    const [openInvitesCount, usersCount] = await Promise.all([
      this.countInvites.execute(new CountPendingInvitesByOrgIdQuery(orgId)),
      this.countUsers.execute(new CountUsersByOrgIdQuery(orgId)),
    ]);
    if (openInvitesCount + usersCount > noOfSeats) {
      this.logger.warn(
        {
          orgId,
          openInvites: openInvitesCount,
        },
        'Too many used seats',
      );
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
