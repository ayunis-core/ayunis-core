import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { SubscriptionBillingInfoRecord } from '../schema/subscription-billing-info.record';
import type { UUID } from 'crypto';

export class SubscriptionBillingInfoMapper {
  toRecord(
    billingInfo: SubscriptionBillingInfo,
    subscriptionId: UUID,
  ): SubscriptionBillingInfoRecord {
    const record = new SubscriptionBillingInfoRecord();
    record.id = billingInfo.id;
    record.createdAt = billingInfo.createdAt;
    record.updatedAt = billingInfo.updatedAt;
    record.companyName = billingInfo.companyName;
    record.subText = billingInfo.subText;
    record.street = billingInfo.street;
    record.houseNumber = billingInfo.houseNumber;
    record.postalCode = billingInfo.postalCode;
    record.city = billingInfo.city;
    record.country = billingInfo.country;
    record.vatNumber = billingInfo.vatNumber;
    record.subscriptionId = subscriptionId;
    return record;
  }

  toDomain(record: SubscriptionBillingInfoRecord): SubscriptionBillingInfo {
    return new SubscriptionBillingInfo({
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      companyName: record.companyName,
      subText: record.subText,
      street: record.street,
      houseNumber: record.houseNumber,
      postalCode: record.postalCode,
      city: record.city,
      country: record.country,
      vatNumber: record.vatNumber,
    });
  }
}
