import SharedLicenseSeatsSection from '@/widgets/billing/ui/LicenseSeatsSection';
import type { SubscriptionResponseDto } from '@/shared/api';
import LicenseSeatsUpdateDialog from './LicenseSeatsUpdateDialog';

interface LicenseSeatsSectionProps {
  subscription: SubscriptionResponseDto;
  orgId: string;
}

export default function LicenseSeatsSection({
  subscription,
  orgId,
}: Readonly<LicenseSeatsSectionProps>) {
  return (
    <SharedLicenseSeatsSection
      subscription={subscription}
      translationNamespace="super-admin-settings-org"
      renderUpdateDialog={(trigger) => (
        <LicenseSeatsUpdateDialog
          subscription={subscription}
          orgId={orgId}
          trigger={trigger}
        />
      )}
    />
  );
}
