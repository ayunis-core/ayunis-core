import SharedBillingInfoSection from '@/widgets/billing/ui/BillingInfoSection';
import type { SubscriptionResponseDto } from '@/shared/api';
import BillingInfoUpdateDialog from './BillingInfoUpdateDialog';

interface BillingInfoSectionProps {
  subscription: SubscriptionResponseDto;
}

export default function BillingInfoSection({
  subscription,
}: Readonly<BillingInfoSectionProps>) {
  return (
    <SharedBillingInfoSection
      subscription={subscription}
      translationNamespace="admin-settings-billing"
      renderUpdateDialog={(trigger) => (
        <BillingInfoUpdateDialog
          currentBillingInfo={subscription.billingInfo}
          trigger={trigger}
        />
      )}
    />
  );
}
