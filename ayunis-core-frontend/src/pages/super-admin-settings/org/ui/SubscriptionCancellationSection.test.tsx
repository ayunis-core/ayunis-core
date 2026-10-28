import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SubscriptionResponseDto } from '@/shared/api';
import SubscriptionCancellationSection from './SubscriptionCancellationSection';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/widgets/confirmation-modal', () => ({
  useConfirmation: () => ({ confirm: vi.fn() }),
}));
vi.mock('../api/useSuperAdminSubscriptionCancel', () => ({
  default: () => ({ cancelSubscription: vi.fn() }),
}));
vi.mock('../api/useSuperAdminSubscriptionUncancel', () => ({
  default: () => ({ uncancelSubscription: vi.fn() }),
}));
vi.mock('./SubscriptionStartDateUpdateDialog', () => ({ default: () => null }));

const subscription: SubscriptionResponseDto = {
  id: 'subscription',
  orgId: 'org',
  type: 'SEAT_BASED',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  billingInfo: {
    companyName: 'Town',
    street: 'Main',
    houseNumber: '1',
    postalCode: '10115',
    city: 'Berlin',
    country: 'DE',
  },
  startsAt: '2025-01-01T00:00:00Z',
  endsAt: '2090-08-01T00:00:00Z',
  nextRenewalDate: null,
};

describe('SubscriptionCancellationSection bounded term', () => {
  it('shows an elapsed term as historical without mutation controls', () => {
    render(
      <SubscriptionCancellationSection
        subscription={{ ...subscription, endsAt: '2020-01-01T00:00:00Z' }}
        orgId="org"
      />,
    );
    expect(
      screen.getByText('subscriptionHistory.status.HISTORICAL'),
    ).toBeTruthy();
    expect(screen.queryByText('subscription.active')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByTestId('subscription-access-end')).toBeTruthy();
  });

  it('shows the access end without advertising a renewal when none remains', () => {
    render(
      <SubscriptionCancellationSection
        subscription={subscription}
        orgId="org"
      />,
    );
    expect(screen.getByText('subscription.endsAt')).toBeTruthy();
    expect(screen.queryByText('subscription.nextRenewalDate')).toBeNull();
  });

  it('shows a renewal before the end alongside the access boundary', () => {
    render(
      <SubscriptionCancellationSection
        subscription={{
          ...subscription,
          nextRenewalDate: '2026-07-01T00:00:00Z',
        }}
        orgId="org"
      />,
    );
    expect(screen.getByText('subscription.endsAt')).toBeTruthy();
    expect(screen.getByText('subscription.nextRenewalDate')).toBeTruthy();
  });

  it('preserves the billing date for an open-ended term', () => {
    render(
      <SubscriptionCancellationSection
        subscription={{
          ...subscription,
          endsAt: null,
          nextRenewalDate: '2026-07-01T00:00:00Z',
        }}
        orgId="org"
      />,
    );
    expect(screen.queryByText('subscription.endsAt')).toBeNull();
    expect(screen.getByText('subscription.nextRenewalDate')).toBeTruthy();
  });
});
