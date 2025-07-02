import { Injectable } from '@nestjs/common';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { SubscriptionRecord } from '../schema/subscription.record';
import { Org } from 'src/iam/orgs/domain/org.entity';

@Injectable()
export class SubscriptionMapper {
  toDomain(record: SubscriptionRecord): Subscription {
    const org = new Org({
      id: record.org.id,
      name: record.org.name,
    });

    return new Subscription({
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      cancelledAt: record.cancelledAt,
      org: org,
      pricePerSeat: record.pricePerSeat,
      billingCycle: record.billingCycle,
      billingCycleAnchor: record.billingCycleAnchor,
    });
  }

  toRecord(domain: Subscription): SubscriptionRecord {
    const record = new SubscriptionRecord();
    record.id = domain.id;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    record.cancelledAt = domain.cancelledAt;
    record.orgId = domain.org.id;
    record.pricePerSeat = domain.pricePerSeat;
    record.billingCycle = domain.billingCycle;
    record.billingCycleAnchor = domain.billingCycleAnchor;

    // Note: The org relationship will need to be populated separately
    // when saving, as we only store the orgId in the record
    return record;
  }
}
