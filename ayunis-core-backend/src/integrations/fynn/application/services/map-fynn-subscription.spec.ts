import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SubscriptionType } from 'src/iam/subscriptions/domain/value-objects/subscription-type.enum';
import { mapFynnSubscription } from './map-fynn-subscription';
import type { FynnSnapshot } from 'src/integrations/fynn/application/models/fynn-snapshot';

const now = new Date('2026-10-20T15:00:00Z');
const fixtures = ['preview-cases.json', 'preview-transitions.json'].flatMap(
  (file) =>
    JSON.parse(
      readFileSync(join(__dirname, 'fixtures', file), 'utf8'),
    ) as Array<FynnSnapshot & { case: string }>,
);

function fixture(number: string): FynnSnapshot {
  const entry = fixtures.find((value) => value.case === number);
  if (!entry) throw new Error(`Missing Preview case ${number}`);
  return structuredClone(entry);
}

describe('Fynn subscription mapping', () => {
  it('rejects unsupported entitlement status before it can remove existing access', () => {
    const snapshot = fixture('03');
    for (const entitlement of snapshot.entitlements)
      entitlement.status = 'future-provider-state';
    expect(() => mapFynnSubscription(snapshot, now)).toThrow(/status/i);
  });
  it.each(['core-academy', 'core-subscription-type'])(
    'does not retain paid access for an isolated %s entitlement',
    (feature) => {
      const snapshot = fixture('03');
      snapshot.entitlements = snapshot.entitlements.filter(
        (entry) => entry.feature.id === feature,
      );
      expect(mapFynnSubscription(snapshot, now)).toMatchObject({
        subscription: null,
        academyActive: false,
      });
    },
  );

  it('preserves Core while a future-only subscription is waiting to start', () => {
    const snapshot = fixture('19');
    snapshot.entitlements = snapshot.entitlements.filter(
      (e) => e.status === 'pending',
    );
    snapshot.subscription.items = snapshot.subscription.items.filter(
      (item) => new Date(item.contractDetails.contractStart!) > now,
    );
    expect(() => mapFynnSubscription(snapshot, now)).toThrow(/entitlement/i);
  });
  it('ends access in a gap after an ended item and before its pending successor', () => {
    const snapshot = fixture('19');
    for (const entry of snapshot.entitlements)
      if (entry.status === 'active') entry.status = 'expired';
    expect(
      mapFynnSubscription(snapshot, new Date('2026-12-31T12:00:00Z'))
        .subscription,
    ).toBeNull();
  });

  it('ignores archived active credit rows when deciding whether access has ended', () => {
    const snapshot = fixture('02');
    snapshot.entitlements = snapshot.entitlements.filter(
      (e) => e.feature.id === 'core-additional-credits',
    );
    expect(mapFynnSubscription(snapshot, now).subscription).toBeNull();
  });
  it('ends an expired trial even if an Academy entitlement remains active', () => {
    const snapshot = fixture('20');
    snapshot.entitlements = fixture('03').entitlements.filter(
      (e) => e.feature.id === 'core-academy',
    );
    expect(
      mapFynnSubscription(snapshot, new Date('2027-01-15T00:00:00Z')),
    ).toMatchObject({ subscription: null, academyActive: false });
  });

  it('keeps the legacy seat plan until its scheduled switch in Preview case 19', () => {
    expect(mapFynnSubscription(fixture('19'), now).subscription).toMatchObject({
      type: SubscriptionType.SEAT_BASED,
      noOfSeats: 10,
    });
  });

  it.each([
    ['18', '2027-10-15T00:00:01Z'],
    ['19', '2027-01-01T00:00:01Z'],
  ])('applies the scheduled usage package in Preview case %s', (number, at) => {
    const snapshot = fixture(number);
    for (const entitlement of snapshot.entitlements) {
      entitlement.status =
        entitlement.status === 'pending' ? 'active' : 'expired';
    }
    expect(
      mapFynnSubscription(snapshot, new Date(at)).subscription,
    ).toMatchObject({
      type: SubscriptionType.USAGE_BASED,
      monthlyCredits: 20_750_000,
    });
  });

  it('ends the paid trial after its entitlements end even when Fynn remains active', () => {
    const snapshot = fixture('20');
    for (const entitlement of snapshot.entitlements) {
      if (entitlement.status === 'active') entitlement.status = 'expired';
    }
    expect(
      mapFynnSubscription(snapshot, new Date('2027-01-15T00:00:00Z')),
    ).toMatchObject({
      subscription: null,
      academyActive: false,
    });
  });

  it('ends an expired trial even if Fynn no longer returns its entitlements', () => {
    const snapshot = fixture('20');
    snapshot.entitlements = [];
    expect(
      mapFynnSubscription(snapshot, new Date('2027-01-15T00:00:00Z'))
        .subscription,
    ).toBeNull();
  });

  it('retries a pending successor instead of clearing access during provisioning', () => {
    const snapshot = fixture('19');
    snapshot.entitlements = snapshot.entitlements.filter(
      (e) => e.status === 'pending',
    );
    expect(() =>
      mapFynnSubscription(snapshot, new Date('2027-01-01T00:00:01Z')),
    ).toThrow(/entitlement/i);
  });

  it.each([
    ['01', 20_750_000],
    ['02', 45_000_000],
    ['03', 100_000_000],
    ['05', 10_375_000],
    ['07', 167_000_000],
    ['08', 300_000_000],
    ['09', 45_000_000],
    ['13', 20_750_000],
    ['14', 20_750_000],
    ['17', 20_750_000],
    ['18', 45_000_000],
    ['20', 10_375_000],
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

  it('ignores archived additional credits when applying a monthly credit override', () => {
    const snapshot = fixture('08');
    const extra = fixture('02').entitlements.find(
      (value) => value.feature.id === 'core-additional-credits',
    );
    expect(extra).toBeDefined();
    snapshot.entitlements.push(extra!);
    expect(mapFynnSubscription(snapshot, now).subscription).toMatchObject({
      monthlyCredits: 300_000_000,
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
        entitlement.status === 'pending' ? 'active' : 'expired';
    }
    expect(
      mapFynnSubscription(snapshot, new Date('2027-01-01T00:00:01Z'))
        .subscription,
    ).toMatchObject({ monthlyCredits: 45_000_000 });
  });
});
