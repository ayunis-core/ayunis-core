import { Injectable } from '@nestjs/common';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { SeatBasedSubscription } from 'src/iam/subscriptions/domain/seat-based-subscription.entity';
import { UsageBasedSubscription } from 'src/iam/subscriptions/domain/usage-based-subscription.entity';
import {
  SubscriptionRecord,
  SeatBasedSubscriptionRecord,
  UsageBasedSubscriptionRecord,
} from '../schema/subscription.record';
import { SubscriptionBillingInfoMapper } from './subscription-billing-info.mapper';
import { InvalidSubscriptionDataError } from 'src/iam/subscriptions/application/subscription.errors';

@Injectable()
export class SubscriptionMapper {
  constructor(
    private readonly subscriptionBillingInfoMapper: SubscriptionBillingInfoMapper,
  ) {}

  toDomain(record: SubscriptionRecord): Subscription {
    if (record instanceof SeatBasedSubscriptionRecord) {
      return this.seatBasedToDomain(record);
    }

    if (record instanceof UsageBasedSubscriptionRecord) {
      return this.usageBasedToDomain(record);
    }

    throw new Error(
      `Unknown subscription record type: ${record.constructor.name}`,
    );
  }

  toRecord(domain: Subscription): SubscriptionRecord {
    if (domain instanceof SeatBasedSubscription) {
      const record = new SeatBasedSubscriptionRecord();
      record.id = domain.id;
      record.createdAt = domain.createdAt;
      record.updatedAt = domain.updatedAt;
      record.cancelledAt = domain.cancelledAt;
      record.startsAt = domain.startsAt;
      record.orgId = domain.orgId;
      record.noOfSeats = domain.noOfSeats;
      record.pricePerSeat = domain.pricePerSeat;
      record.renewalCycle = domain.renewalCycle;
      record.renewalCycleAnchor = domain.renewalCycleAnchor;
      record.billingInfo = this.subscriptionBillingInfoMapper.toRecord(
        domain.billingInfo,
        domain.id,
      );
      return record;
    }

    if (domain instanceof UsageBasedSubscription) {
      const record = new UsageBasedSubscriptionRecord();
      record.id = domain.id;
      record.createdAt = domain.createdAt;
      record.updatedAt = domain.updatedAt;
      record.cancelledAt = domain.cancelledAt;
      record.startsAt = domain.startsAt;
      record.orgId = domain.orgId;
      record.monthlyCredits = domain.monthlyCredits;
      record.billingInfo = this.subscriptionBillingInfoMapper.toRecord(
        domain.billingInfo,
        domain.id,
      );
      return record;
    }

    throw new Error(
      `Unknown subscription domain type: ${domain.constructor.name}`,
    );
  }

  private seatBasedToDomain(
    record: SeatBasedSubscriptionRecord,
  ): SeatBasedSubscription {
    const nullFields = (
      [
        'noOfSeats',
        'pricePerSeat',
        'renewalCycle',
        'renewalCycleAnchor',
      ] as const
    ).filter((field) => record[field] === null);

    if (nullFields.length > 0) {
      throw new InvalidSubscriptionDataError(
        `Seat-based subscription ${record.id} has null fields: ${nullFields.join(', ')}`,
      );
    }

    return new SeatBasedSubscription({
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      cancelledAt: record.cancelledAt,
      startsAt: record.startsAt,
      orgId: record.orgId,
      noOfSeats: record.noOfSeats!,
      pricePerSeat: record.pricePerSeat!,
      renewalCycle: record.renewalCycle!,
      renewalCycleAnchor: record.renewalCycleAnchor!,
      billingInfo: this.subscriptionBillingInfoMapper.toDomain(
        record.billingInfo,
      ),
    });
  }

  private usageBasedToDomain(
    record: UsageBasedSubscriptionRecord,
  ): UsageBasedSubscription {
    if (record.monthlyCredits === null) {
      throw new InvalidSubscriptionDataError(
        `Usage-based subscription ${record.id} has null monthlyCredits`,
      );
    }

    return new UsageBasedSubscription({
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      cancelledAt: record.cancelledAt,
      startsAt: record.startsAt,
      orgId: record.orgId,
      monthlyCredits: record.monthlyCredits,
      billingInfo: this.subscriptionBillingInfoMapper.toDomain(
        record.billingInfo,
      ),
    });
  }
}
