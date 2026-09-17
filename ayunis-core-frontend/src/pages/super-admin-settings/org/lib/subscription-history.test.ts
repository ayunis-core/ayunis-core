import { describe, expect, it } from 'vitest';
import {
  shouldShowSubscriptionHistory,
  subscriptionHistoryBadgeVariant,
  toSubscriptionHistoryItem,
} from './subscription-history';
import type { OrgSubscriptionHistoryItemDto } from '@/shared/api';

describe('shouldShowSubscriptionHistory', () => {
  it('hides the history table when there is at most one subscription', () => {
    expect(shouldShowSubscriptionHistory(0)).toBe(false);
    expect(shouldShowSubscriptionHistory(1)).toBe(false);
  });

  it('shows the history table when there is more than one subscription', () => {
    expect(shouldShowSubscriptionHistory(2)).toBe(true);
  });
});

describe('subscriptionHistoryBadgeVariant', () => {
  it('maps lifecycle statuses to distinct badge variants', () => {
    expect(subscriptionHistoryBadgeVariant('ACTIVE')).toBe('secondary');
    expect(subscriptionHistoryBadgeVariant('SCHEDULED')).toBe('outline');
    expect(subscriptionHistoryBadgeVariant('CANCELLED')).toBe('destructive');
    expect(subscriptionHistoryBadgeVariant('HISTORICAL')).toBe('ghost');
  });
});

describe('toSubscriptionHistoryItem', () => {
  it('copies list fields and coerces a string cancelledAt', () => {
    const item = {
      id: '22222222-2222-2222-2222-222222222222',
      createdAt: '2025-06-01T00:00:00.000Z',
      updatedAt: '2025-06-01T00:00:00.000Z',
      cancelledAt: '2025-07-01T00:00:00.000Z',
      startsAt: '2025-06-01T00:00:00.000Z',
      orgId: '11111111-1111-1111-1111-111111111111',
      type: 'SEAT_BASED',
      noOfSeats: 8,
      nextRenewalDate: '2026-06-01T00:00:00.000Z',
      billingInfo: {
        companyName: 'Gemeinde Musterstadt',
        street: 'Hauptstraße',
        houseNumber: '1',
        city: 'Musterstadt',
        postalCode: '12345',
        country: 'DE',
      },
      status: 'CANCELLED',
      isLatest: true,
    } as unknown as OrgSubscriptionHistoryItemDto;

    expect(toSubscriptionHistoryItem(item)).toEqual({
      id: item.id,
      type: 'SEAT_BASED',
      status: 'CANCELLED',
      isLatest: true,
      createdAt: item.createdAt,
      startsAt: item.startsAt,
      cancelledAt: '2025-07-01T00:00:00.000Z',
      noOfSeats: 8,
      monthlyCredits: undefined,
    });
  });

  it('treats an unknown status as historical', () => {
    const item = {
      id: '33333333-3333-3333-3333-333333333333',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      startsAt: '2025-01-01T00:00:00.000Z',
      orgId: '11111111-1111-1111-1111-111111111111',
      type: 'USAGE_BASED',
      monthlyCredits: 1000,
      nextRenewalDate: '2025-02-01T00:00:00.000Z',
      billingInfo: {
        companyName: 'Gemeinde Musterstadt',
        street: 'Hauptstraße',
        houseNumber: '1',
        city: 'Musterstadt',
        postalCode: '12345',
        country: 'DE',
      },
      status: 'UNKNOWN',
      isLatest: false,
    } as unknown as OrgSubscriptionHistoryItemDto;

    expect(toSubscriptionHistoryItem(item).status).toBe('HISTORICAL');
    expect(toSubscriptionHistoryItem(item).cancelledAt).toBeNull();
  });
});
