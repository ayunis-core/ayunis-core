import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import { mapFynnSubscription } from './map-fynn-subscription';
import type { FynnSnapshot } from 'src/integrations/fynn/application/models/fynn-snapshot';

const now = new Date('2026-10-20T12:00:00Z');
const fixtures = JSON.parse(
  readFileSync(join(__dirname, 'fixtures/preview-cases.json'), 'utf8'),
) as Array<FynnSnapshot & { case: string }>;

function fixture(number: string): FynnSnapshot {
  const entry = fixtures.find((value) => value.case === number);
  if (!entry) throw new Error(`Missing Preview case ${number}`);
  return structuredClone(entry);
}

describe('Fynn subscription mapping', () => {
  it.each([
    ['01', 20_750_000],
    ['02', 60_000_000],
    ['03', 100_000_000],
    ['05', 10_375_000],
    ['07', 187_000_000],
    ['08', 300_000_000],
    ['09', 45_000_000],
    ['13', 20_750_000],
    ['14', 20_750_000],
  ])('maps Preview case %s to %i monthly credits', (number, credits) => {
    expect(
      mapFynnSubscription(fixture(number), now).subscription,
    ).toMatchObject({
      type: SubscriptionType.USAGE_BASED,
      monthlyCredits: credits,
    });
  });

  it('reads the quantity of the seat entitlement item in Preview case 04', () => {
    expect(mapFynnSubscription(fixture('04'), now).subscription).toMatchObject({
      type: SubscriptionType.SEAT_BASED,
      noOfSeats: 25,
    });
  });

  it.each(['03', '07'])('enables Academy for Preview case %s', (number) => {
    expect(mapFynnSubscription(fixture(number), now).academyActive).toBe(true);
  });

  it.each(['01', '02', '04', '13'])(
    'keeps Academy disabled for Preview case %s',
    (number) => {
      expect(mapFynnSubscription(fixture(number), now).academyActive).toBe(
        false,
      );
    },
  );

  it('rejects the missing organization link in Preview case 10', () => {
    expect(() => mapFynnSubscription(fixture('10'), now)).toThrow(
      /organization/i,
    );
  });

  it('reads the customer default address without combining street and house number', () => {
    expect(mapFynnSubscription(fixture('02'), now)).toMatchObject({
      orgId: '00000000-0000-4000-8000-000000000002',
      subscription: {
        billingInfo: {
          street: 'Example Street',
          houseNumber: '1',
          postalCode: '10115',
          country: 'DE',
        },
      },
    });
  });

  it('preserves the explicit cancellation boundary of Preview case 09', () => {
    expect(mapFynnSubscription(fixture('09'), now).subscription).toMatchObject({
      accessEndsAt: new Date('2027-10-15T00:00:00Z'),
      cancelledAt: new Date('2026-10-15T11:52:15Z'),
    });
  });

  it('ends access exactly at the cancellation boundary', () => {
    expect(
      mapFynnSubscription(fixture('09'), new Date('2027-10-15T00:00:00Z'))
        .subscription,
    ).toBeNull();
  });

  it.each(['terminated', 'paused', 'voided', 'draft', 'offer'])(
    'removes access for %s',
    (status) => {
      const snapshot = fixture('03');
      snapshot.subscription.status = status;
      expect(mapFynnSubscription(snapshot, now)).toMatchObject({
        subscription: null,
        academyActive: false,
      });
    },
  );

  it.each(['06', '12'])(
    'maps inactive Preview case %s without requiring entitlements',
    (number) => {
      expect(mapFynnSubscription(fixture(number), now).subscription).toBeNull();
    },
  );

  it('does not clear an active subscription when entitlements are not ready', () => {
    const snapshot = fixture('02');
    snapshot.entitlements = [];
    expect(() => mapFynnSubscription(snapshot, now)).toThrow(/entitlement/i);
  });

  it('applies an override only to its own feature, retaining additional credits', () => {
    const snapshot = fixture('08');
    const extra = fixture('02').entitlements.find(
      (value) => value.feature.id === 'core-additional-credits',
    );
    expect(extra).toBeDefined();
    snapshot.entitlements.push(extra!);
    expect(mapFynnSubscription(snapshot, now).subscription).toMatchObject({
      monthlyCredits: 315_000_000,
    });
  });

  it.each(['-1', 'NaN', '1.5', '9007199254740992'])(
    'rejects unsafe credit value %s',
    (value) => {
      const snapshot = fixture('01');
      snapshot.entitlements.find(
        (entry) => entry.feature.id === 'core-monthly-credits',
      )!.value = value;
      expect(() => mapFynnSubscription(snapshot, now)).toThrow(/credit/i);
    },
  );

  it('rejects a fractional seat count', () => {
    const snapshot = fixture('04');
    snapshot.subscription.items[0].currentMeasurementValue!.quantity = 2.5;
    expect(() => mapFynnSubscription(snapshot, now)).toThrow(/seat/i);
  });

  it('uses entitlement state rather than the cancelled item state for paid trial credits', () => {
    expect(mapFynnSubscription(fixture('13'), now).subscription).toMatchObject({
      monthlyCredits: 20_750_000,
    });
  });

  it('switches the budget when the next period entitlement becomes active', () => {
    const snapshot = fixture('14');
    for (const entitlement of snapshot.entitlements) {
      entitlement.status =
        entitlement.status === 'pending' ? 'active' : 'ended';
    }
    expect(
      mapFynnSubscription(snapshot, new Date('2027-01-01T00:00:01Z'))
        .subscription,
    ).toMatchObject({ monthlyCredits: 45_000_000 });
  });
});
