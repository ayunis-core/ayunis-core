import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SubscriptionHistorySection from './SubscriptionHistorySection';
import type { SubscriptionHistoryItem } from '@/pages/super-admin-settings/org/model/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('./ResolveSubscriptionOverlapDialog', () => ({
  default: () => (
    <button data-testid="resolve-subscription-overlap-trigger" type="button" />
  ),
}));

const older: SubscriptionHistoryItem = {
  id: '11111111-1111-1111-1111-111111111111',
  type: 'SEAT_BASED',
  status: 'HISTORICAL',
  isLatest: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  startsAt: '2024-01-01T00:00:00.000Z',
  cancelledAt: '2024-06-01T00:00:00.000Z',
  accessEndsAt: '2024-07-01T00:00:00.000Z',
  noOfSeats: 5,
};

const latest: SubscriptionHistoryItem = {
  id: '22222222-2222-2222-2222-222222222222',
  type: 'USAGE_BASED',
  status: 'ACTIVE',
  isLatest: true,
  createdAt: '2025-06-01T00:00:00.000Z',
  startsAt: '2025-06-01T00:00:00.000Z',
  accessEndsAt: null,
  monthlyCredits: 1000,
};

describe('SubscriptionHistorySection', () => {
  it('does not render history when there is only one subscription', () => {
    render(
      <SubscriptionHistorySection
        orgId="55555555-5555-5555-5555-555555555555"
        subscriptions={[latest]}
        activeCount={1}
      />,
    );

    expect(screen.queryByTestId('subscription-history')).toBeNull();
    expect(
      screen.queryByTestId('subscription-multiple-active-alert'),
    ).toBeNull();
  });

  it('lists every subscription with distinct statuses and a latest marker', () => {
    render(
      <SubscriptionHistorySection
        orgId="55555555-5555-5555-5555-555555555555"
        subscriptions={[latest, older]}
        activeCount={1}
      />,
    );

    expect(screen.getByTestId('subscription-history')).toBeTruthy();
    expect(
      screen.getByTestId(`subscription-history-row-${latest.id}`),
    ).toBeTruthy();
    expect(
      screen.getByTestId(`subscription-history-row-${older.id}`),
    ).toBeTruthy();
    expect(
      screen.getByTestId(`subscription-history-status-${latest.id}`)
        .textContent,
    ).toBe('subscriptionHistory.status.ACTIVE');
    expect(
      screen.getByTestId(`subscription-history-status-${older.id}`).textContent,
    ).toBe('subscriptionHistory.status.HISTORICAL');
    expect(screen.getByTestId('subscription-history-latest')).toBeTruthy();
    expect(
      screen.getByText('subscriptionHistory.columns.accessEndsAt'),
    ).toBeTruthy();
    expect(
      screen.queryByTestId('subscription-multiple-active-alert'),
    ).toBeNull();
  });

  it('surfaces multiple currently serving subscriptions instead of hiding them', () => {
    const secondActive: SubscriptionHistoryItem = {
      ...older,
      id: '33333333-3333-3333-3333-333333333333',
      status: 'ACTIVE',
      cancelledAt: null,
    };

    render(
      <SubscriptionHistorySection
        orgId="55555555-5555-5555-5555-555555555555"
        subscriptions={[latest, secondActive]}
        activeCount={2}
      />,
    );

    expect(
      screen.getByTestId('subscription-multiple-active-alert').textContent,
    ).toContain('subscriptionHistory.multipleActive');
    expect(
      screen.getByTestId('resolve-subscription-overlap-trigger'),
    ).toBeTruthy();
  });
});
