import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  buildCreateSubscriptionFormSchema,
  subscriptionFormDefaultValues,
} from './subscriptionForm';
const valid = {
  ...subscriptionFormDefaultValues,
  companyName: 'Musterstadt',
  street: 'Hauptstrasse',
  houseNumber: '1',
  postalCode: '12345',
  city: 'Musterstadt',
  country: 'DE',
};
const schema = () => buildCreateSubscriptionFormSchema((key) => key);
afterEach(() => vi.useRealTimers());
describe('subscription creation access end', () => {
  it.each(['SEAT_BASED', 'USAGE_BASED'])(
    'accepts a valid bounded %s subscription',
    (type) => {
      expect(
        schema().safeParse({
          ...valid,
          type,
          startsAt: '2027-01-01T00:00:00.000Z',
          endsAt: '2027-02-01T00:00:00.000Z',
        }).success,
      ).toBe(true);
    },
  );
  it('preserves open-ended creation', () => {
    expect(schema().safeParse(valid).success).toBe(true);
  });
  it.each(['2026-12-31T00:00:00.000Z', '2027-01-01T00:00:00.000Z', 'invalid'])(
    'rejects invalid end %s on the end field',
    (endsAt) => {
      const result = schema().safeParse({
        ...valid,
        startsAt: '2027-01-01T00:00:00.000Z',
        endsAt,
      });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues[0].path).toEqual(['endsAt']);
    },
  );
  it('validates against submission time when no start is supplied', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-01-01T00:00:00Z'));
    expect(
      schema().safeParse({ ...valid, endsAt: '2027-01-01T00:00:00.000Z' })
        .success,
    ).toBe(false);
    expect(
      schema().safeParse({ ...valid, endsAt: '2027-01-02T00:00:00.000Z' })
        .success,
    ).toBe(true);
  });
});
