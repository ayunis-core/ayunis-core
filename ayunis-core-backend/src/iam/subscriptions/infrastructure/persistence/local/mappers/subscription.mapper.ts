import { Injectable } from '@nestjs/common';
import { Subscription } from 'src/iam/subscriptions/domain/subscription.entity';
import { SubscriptionRecord } from '../schema/subscription.record';

@Injectable()
export class SubscriptionMapper {
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
    });
  }

  toRecord(domain: Subscription): SubscriptionRecord {
    const record = new SubscriptionRecord();
    record.id = domain.id;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    record.cancelledAt = domain.cancelledAt ?? undefined;
    record.orgId = domain.orgId;
    record.pricePerSeat = domain.pricePerSeat;
    record.noOfSeats = domain.noOfSeats;
    record.renewalCycle = domain.renewalCycle;
    record.renewalCycleAnchor = domain.renewalCycleAnchor;

    // Note: The org relationship will need to be populated separately
    // when saving, as we only store the orgId in the record
    return record;
  }
}
