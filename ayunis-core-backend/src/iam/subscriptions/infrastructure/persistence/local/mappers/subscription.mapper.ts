import { Injectable } from '@nestjs/common';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { SubscriptionRecord } from '../schema/subscription.record';
import { SubscriptionBillingInfoMapper } from './subscription-billing-info.mapper';

@Injectable()
export class SubscriptionMapper {
  constructor(
    private readonly subscriptionBillingInfoMapper: SubscriptionBillingInfoMapper,
  ) {}

  toDomain(record: SubscriptionRecord): Subscription {
    return new Subscription({
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      cancelledAt: record.cancelledAt,
      orgId: record.orgId,
      noOfSeats: record.noOfSeats,
      pricePerSeat: record.pricePerSeat,
      renewalCycle: record.renewalCycle,
      renewalCycleAnchor: record.renewalCycleAnchor,
      billingInfo: this.subscriptionBillingInfoMapper.toDomain(
        record.billingInfo,
      ),
    });
  }

  toRecord(domain: Subscription): SubscriptionRecord {
    const record = new SubscriptionRecord();
    record.id = domain.id;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    record.cancelledAt = domain.cancelledAt;
    record.orgId = domain.orgId;
    record.pricePerSeat = domain.pricePerSeat;
    record.noOfSeats = domain.noOfSeats;
    record.renewalCycle = domain.renewalCycle;
    record.renewalCycleAnchor = domain.renewalCycleAnchor;
    record.billingInfo = this.subscriptionBillingInfoMapper.toRecord(
      domain.billingInfo,
      domain.id,
    );

    return record;
  }
}
