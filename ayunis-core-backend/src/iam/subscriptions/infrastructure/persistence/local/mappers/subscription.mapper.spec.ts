import { randomUUID } from 'crypto';
import { SubscriptionMapper } from './subscription.mapper';
import { SubscriptionBillingInfoMapper } from './subscription-billing-info.mapper';
import {
  SeatBasedSubscriptionRecord,
  UsageBasedSubscriptionRecord,
} from '../schema/subscription.record';
import { SeatBasedSubscription } from 'src/iam/subscriptions/domain/seat-based-subscription.entity';
import { UsageBasedSubscription } from 'src/iam/subscriptions/domain/usage-based-subscription.entity';
import { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import { SubscriptionBillingInfo } from 'src/iam/subscriptions/domain/subscription-billing-info.entity';
import { SubscriptionBillingInfoRecord } from '../schema/subscription-billing-info.record';
import { InvalidSubscriptionDataError } from 'src/iam/subscriptions/application/subscription.errors';

function createBillingInfoRecord(): SubscriptionBillingInfoRecord {
  const record = new SubscriptionBillingInfoRecord();
  record.id = randomUUID();
  record.createdAt = new Date();
  record.updatedAt = new Date();
  record.companyName = 'Gemeinde Musterstadt';
  record.street = 'Hauptstraße';
  record.houseNumber = '1';
  record.postalCode = '12345';
  record.city = 'Musterstadt';
  record.country = 'DE';
  record.subscriptionId = randomUUID();
  return record;
}

function createSeatBasedRecord(
  overrides: Partial<{
    noOfSeats: number | null;
    pricePerSeat: number | null;
    renewalCycle: RenewalCycle | null;
    renewalCycleAnchor: Date | null;
  }> = {},
): SeatBasedSubscriptionRecord {
  const record = new SeatBasedSubscriptionRecord();
  record.id = randomUUID();
  record.createdAt = new Date();
  record.updatedAt = new Date();
  record.cancelledAt = null;
  record.orgId = randomUUID();
  record.noOfSeats =
    overrides.noOfSeats === null
      ? (null as unknown as number)
      : (overrides.noOfSeats ?? 10);
  record.pricePerSeat =
    overrides.pricePerSeat === null
      ? (null as unknown as number)
      : (overrides.pricePerSeat ?? 9.99);
  record.renewalCycle =
    overrides.renewalCycle === null
      ? (null as unknown as RenewalCycle)
      : (overrides.renewalCycle ?? RenewalCycle.MONTHLY);
  record.renewalCycleAnchor =
    overrides.renewalCycleAnchor === null
      ? (null as unknown as Date)
      : (overrides.renewalCycleAnchor ?? new Date('2025-01-01'));
  record.billingInfo = createBillingInfoRecord();
  return record;
}

describe('SubscriptionMapper', () => {
  const billingInfoMapper = new SubscriptionBillingInfoMapper();
  const mapper = new SubscriptionMapper(billingInfoMapper);

  describe('toDomain - seat-based', () => {
    it('should map a valid seat-based record to domain', () => {
      const record = createSeatBasedRecord();
      const domain = mapper.toDomain(record);

      expect(domain).toBeInstanceOf(SeatBasedSubscription);
      const seatBased = domain as SeatBasedSubscription;
      expect(seatBased.noOfSeats).toBe(10);
      expect(seatBased.pricePerSeat).toBe(9.99);
      expect(seatBased.renewalCycle).toBe(RenewalCycle.MONTHLY);
    });

    it('should throw InvalidSubscriptionDataError when noOfSeats is null', () => {
      const record = createSeatBasedRecord({ noOfSeats: null });
      expect(() => mapper.toDomain(record)).toThrow(
        InvalidSubscriptionDataError,
      );
    });

    it('should throw InvalidSubscriptionDataError when pricePerSeat is null', () => {
      const record = createSeatBasedRecord({ pricePerSeat: null });
      expect(() => mapper.toDomain(record)).toThrow(
        InvalidSubscriptionDataError,
      );
    });

    it('should throw InvalidSubscriptionDataError when renewalCycle is null', () => {
      const record = createSeatBasedRecord({ renewalCycle: null });
      expect(() => mapper.toDomain(record)).toThrow(
        InvalidSubscriptionDataError,
      );
    });

    it('should throw InvalidSubscriptionDataError when renewalCycleAnchor is null', () => {
      const record = createSeatBasedRecord({ renewalCycleAnchor: null });
      expect(() => mapper.toDomain(record)).toThrow(
        InvalidSubscriptionDataError,
      );
    });
  });

  describe('toDomain - usage-based', () => {
    it('should map a valid usage-based record to domain', () => {
      const record = new UsageBasedSubscriptionRecord();
      record.id = randomUUID();
      record.createdAt = new Date();
      record.updatedAt = new Date();
      record.cancelledAt = null;
      record.orgId = randomUUID();
      record.monthlyCredits = 500;
      record.billingInfo = createBillingInfoRecord();

      const domain = mapper.toDomain(record);

      expect(domain).toBeInstanceOf(UsageBasedSubscription);
      expect((domain as UsageBasedSubscription).monthlyCredits).toBe(500);
    });

    it('should throw InvalidSubscriptionDataError when monthlyCredits is null', () => {
      const record = new UsageBasedSubscriptionRecord();
      record.id = randomUUID();
      record.createdAt = new Date();
      record.updatedAt = new Date();
      record.cancelledAt = null;
      record.orgId = randomUUID();
      record.monthlyCredits = null as unknown as number;
      record.billingInfo = createBillingInfoRecord();

      expect(() => mapper.toDomain(record)).toThrow(
        InvalidSubscriptionDataError,
      );
    });
  });

  describe('round-trip', () => {
    it('should preserve all seat-based fields through domain → record → domain', () => {
      const original = new SeatBasedSubscription({
        orgId: randomUUID(),
        noOfSeats: 25,
        pricePerSeat: 14.5,
        renewalCycle: RenewalCycle.YEARLY,
        renewalCycleAnchor: new Date('2025-06-15'),
        billingInfo: new SubscriptionBillingInfo({
          companyName: 'Stadt Beispielburg',
          street: 'Rathausplatz',
          houseNumber: '3',
          postalCode: '54321',
          city: 'Beispielburg',
          country: 'AT',
        }),
      });

      const record = mapper.toRecord(original);
      const restored = mapper.toDomain(
        record as SeatBasedSubscriptionRecord,
      ) as SeatBasedSubscription;

      expect(restored.id).toBe(original.id);
      expect(restored.orgId).toBe(original.orgId);
      expect(restored.noOfSeats).toBe(original.noOfSeats);
      expect(restored.pricePerSeat).toBe(original.pricePerSeat);
      expect(restored.renewalCycle).toBe(original.renewalCycle);
      expect(restored.renewalCycleAnchor).toEqual(original.renewalCycleAnchor);
    });

    it('should preserve all usage-based fields through domain → record → domain', () => {
      const original = new UsageBasedSubscription({
        orgId: randomUUID(),
        monthlyCredits: 2000,
        billingInfo: new SubscriptionBillingInfo({
          companyName: 'Verein Digital',
          street: 'Digitalweg',
          houseNumber: '7',
          postalCode: '67890',
          city: 'Techstadt',
          country: 'CH',
        }),
      });

      const record = mapper.toRecord(original);
      const restored = mapper.toDomain(
        record as UsageBasedSubscriptionRecord,
      ) as UsageBasedSubscription;

      expect(restored.id).toBe(original.id);
      expect(restored.orgId).toBe(original.orgId);
      expect(restored.monthlyCredits).toBe(original.monthlyCredits);
    });
  });
});
