import SharedLicenseSeatsUpdateDialog from '@/widgets/billing/ui/LicenseSeatsUpdateDialog';
import type { SubscriptionResponseDto } from '@ayunis/api-client';
import useSuperAdminSubscriptionSeatsUpdate from '@/pages/super-admin-settings/org/api/useSuperAdminSubscriptionSeatsUpdate';

interface LicenseSeatsUpdateDialogProps {
  subscription: SubscriptionResponseDto;
  orgId: string;
  trigger: React.ReactNode;
}

export default function LicenseSeatsUpdateDialog({
  subscription,
  orgId,
  trigger,
}: Readonly<LicenseSeatsUpdateDialogProps>) {
  const { updateSeats, isPending } =
    useSuperAdminSubscriptionSeatsUpdate(orgId);

  return (
    <SharedLicenseSeatsUpdateDialog
      subscription={subscription}
      trigger={trigger}
      translationNamespace="super-admin-settings-org"
      onUpdateSeats={updateSeats}
      isPending={isPending}
    />
  );
}
