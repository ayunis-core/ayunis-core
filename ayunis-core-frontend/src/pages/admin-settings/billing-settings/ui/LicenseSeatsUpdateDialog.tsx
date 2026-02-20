import SharedLicenseSeatsUpdateDialog from '@/widgets/billing/ui/LicenseSeatsUpdateDialog';
import type { SubscriptionResponseDto } from '@/shared/api';
import useSubscriptionSeatsUpdate from '../api/useSubscriptionSeatsUpdate';

interface LicenseSeatsUpdateDialogProps {
  subscription: SubscriptionResponseDto;
  trigger: React.ReactNode;
}

export default function LicenseSeatsUpdateDialog({
  subscription,
  trigger,
}: Readonly<LicenseSeatsUpdateDialogProps>) {
  const { updateSeats, isPending } = useSubscriptionSeatsUpdate();

  return (
    <SharedLicenseSeatsUpdateDialog
      subscription={subscription}
      trigger={trigger}
      translationNamespace="admin-settings-billing"
      onUpdateSeats={updateSeats}
      isPending={isPending}
    />
  );
}
