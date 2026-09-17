import {
  shouldShowSubscriptionHistory,
  subscriptionHistoryBadgeVariant,
} from './subscription-history';

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
