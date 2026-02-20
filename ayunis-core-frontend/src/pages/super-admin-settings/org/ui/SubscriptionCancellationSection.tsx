import type { SubscriptionResponseDto } from '@/shared/api';
import { SubscriptionCancellationSection as SubscriptionCancellationSectionWidget } from '@/widgets/subscription-cancellation-section';
import { useTranslation } from 'react-i18next';
import useSuperAdminSubscriptionCancel from '../api/useSuperAdminSubscriptionCancel';
import useSuperAdminSubscriptionUncancel from '../api/useSuperAdminSubscriptionUncancel';

interface SubscriptionCancellationSectionProps {
  subscription: SubscriptionResponseDto;
  orgId: string;
}

export default function SubscriptionCancellationSection({
  subscription,
  orgId,
}: SubscriptionCancellationSectionProps) {
  const { t } = useTranslation('super-admin-settings-org');
  const { cancelSubscription } = useSuperAdminSubscriptionCancel(orgId);
  const { uncancelSubscription } = useSuperAdminSubscriptionUncancel(orgId);

  return (
    <SubscriptionCancellationSectionWidget
      subscription={subscription}
      actions={{ cancelSubscription, uncancelSubscription }}
      t={t}
    />
  );
}
