import type { SubscriptionResponseDto } from '@/shared/api';
import { SubscriptionCancellationSection as SubscriptionCancellationSectionWidget } from '@/widgets/subscription-cancellation-section';
import { useTranslation } from 'react-i18next';
import useSubscriptionCancel from '../api/useSubscriptionCancel';
import useSubscriptionUncancel from '../api/useSubscriptionUncancel';

interface SubscriptionCancellationSectionProps {
  subscription: SubscriptionResponseDto;
}

export default function SubscriptionCancellationSection({
  subscription,
}: SubscriptionCancellationSectionProps) {
  const { t } = useTranslation('admin-settings-billing');
  const { cancelSubscription } = useSubscriptionCancel();
  const { uncancelSubscription } = useSubscriptionUncancel();

  return (
    <SubscriptionCancellationSectionWidget
      subscription={subscription}
      actions={{ cancelSubscription, uncancelSubscription }}
      t={t}
    />
  );
}
