import { randomUUID } from 'crypto';
import { SubscriptionBillingInfoMapper } from './subscription-billing-info.mapper';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';

describe('Subscription billing persistence', () => {
  it('writes absent VAT and address addition as explicit null so save clears previous values', () => {
    const billing = new SubscriptionBillingInfo({
      companyName: 'Municipality',
      street: 'Main',
      houseNumber: '1',
      postalCode: '10115',
      city: 'Berlin',
      country: 'DE',
    });
    const record = new SubscriptionBillingInfoMapper().toRecord(
      billing,
      randomUUID(),
    );
    expect(record.vatNumber).toBeNull();
    expect(record.subText).toBeNull();
  });
  it('maps nullable persisted fields back to optional domain values', () => {
    const mapper = new SubscriptionBillingInfoMapper();
    const billing = new SubscriptionBillingInfo({
      companyName: 'Municipality',
      street: 'Main',
      houseNumber: '1',
      postalCode: '10115',
      city: 'Berlin',
      country: 'DE',
    });
    const record = mapper.toRecord(billing, randomUUID());
    Object.assign(record, { vatNumber: null, subText: null });
    expect(mapper.toDomain(record).vatNumber).toBeUndefined();
    expect(mapper.toDomain(record).subText).toBeUndefined();
  });
});
