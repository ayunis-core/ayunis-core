import SharedBillingInfoUpdateDialog from '@/widgets/billing/ui/BillingInfoUpdateDialog';
import type { UpdateBillingInfoDto } from '@/shared/api';
import useBillingInfoUpdate from '../api/useBillingInfoUpdate';

interface BillingInfoUpdateDialogProps {
  currentBillingInfo: UpdateBillingInfoDto;
  trigger: React.ReactNode;
}

export default function BillingInfoUpdateDialog({
  trigger,
  currentBillingInfo,
}: Readonly<BillingInfoUpdateDialogProps>) {
  const { form, updateBillingInfo, isPending } = useBillingInfoUpdate({
    currentBillingInfo,
  });

  return (
    <SharedBillingInfoUpdateDialog
      trigger={trigger}
      translationNamespace="admin-settings-billing"
      form={form}
      onUpdate={updateBillingInfo}
      isPending={isPending}
    />
  );
}
