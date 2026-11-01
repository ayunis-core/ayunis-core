import SharedLicenseSeatsSection from '@/widgets/billing/ui/LicenseSeatsSection';
import type { SubscriptionResponseDto } from '@/shared/api';
import LicenseSeatsUpdateDialog from './LicenseSeatsUpdateDialog';

interface LicenseSeatsSectionProps {
  subscription: SubscriptionResponseDto;
  orgId: string;
  readOnly?: boolean;
}

export default function LicenseSeatsSection({
  subscription,
  orgId,
  readOnly = false,
}: Readonly<LicenseSeatsSectionProps>) {
  return (
    <SharedLicenseSeatsSection
      subscription={subscription}
      translationNamespace="super-admin-settings-org"
      renderUpdateDialog={
        readOnly
          ? undefined
          : (trigger) => (
              <LicenseSeatsUpdateDialog
                subscription={subscription}
                orgId={orgId}
                trigger={trigger}
              />
            )
      }
    />
  );
}
