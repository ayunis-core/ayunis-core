import SharedLicenseSeatsSection from '@/widgets/billing/ui/LicenseSeatsSection';
import type { SubscriptionResponseDto } from '@/shared/api';
import LicenseSeatsUpdateDialog from './LicenseSeatsUpdateDialog';

interface LicenseSeatsSectionProps {
  subscription: SubscriptionResponseDto;
}

export default function LicenseSeatsSection({
  subscription,
}: Readonly<LicenseSeatsSectionProps>) {
  return (
    <SharedLicenseSeatsSection
      subscription={subscription}
      translationNamespace="admin-settings-billing"
      renderUpdateDialog={(trigger) => (
        <LicenseSeatsUpdateDialog
          subscription={subscription}
          trigger={trigger}
        />
      )}
    />
  );
}
