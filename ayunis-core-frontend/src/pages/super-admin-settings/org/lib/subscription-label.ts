import type { TFunction } from 'i18next';
import type { SubscriptionHistoryItem } from '@/pages/super-admin-settings/org/model/types';

export function subscriptionLabel(
  subscription: SubscriptionHistoryItem,
  t: TFunction<'super-admin-settings-org'>,
): string {
  const started = new Date(subscription.startsAt).getTime() <= Date.now();
  const key = started
    ? 'subscriptionOverlap.subscriptionLabelStarted'
    : 'subscriptionOverlap.subscriptionLabel';
  return t(key, {
    type: t(`subscriptionHistory.types.${subscription.type}`),
    date: new Date(subscription.startsAt).toLocaleDateString(),
  });
}
