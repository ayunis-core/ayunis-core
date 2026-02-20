import SharedBillingInfoSection from '@/widgets/billing/ui/BillingInfoSection';
import type { SubscriptionResponseDto } from '@/shared/api';
import BillingInfoUpdateDialog from './BillingInfoUpdateDialog';

interface BillingInfoSectionProps {
  subscription: SubscriptionResponseDto;
  orgId: string;
}

export default function BillingInfoSection({
  subscription,
  orgId,
}: Readonly<BillingInfoSectionProps>) {
  return (
    <SharedBillingInfoSection
      subscription={subscription}
      translationNamespace="super-admin-settings-org"
      renderUpdateDialog={(trigger) => (
        <BillingInfoUpdateDialog
          currentBillingInfo={subscription.billingInfo}
          orgId={orgId}
          trigger={trigger}
        />
      )}
    />
  );
}
