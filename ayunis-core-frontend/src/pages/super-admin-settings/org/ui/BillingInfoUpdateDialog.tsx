import SharedBillingInfoUpdateDialog from '@/widgets/billing/ui/BillingInfoUpdateDialog';
import type { UpdateBillingInfoDto } from '@/shared/api';
import useSuperAdminSubscriptionBillingInfoUpdate from '../api/useSuperAdminSubscriptionBillingInfoUpdate';

interface BillingInfoUpdateDialogProps {
  currentBillingInfo: UpdateBillingInfoDto;
  orgId: string;
  trigger: React.ReactNode;
}

export default function BillingInfoUpdateDialog({
  trigger,
  currentBillingInfo,
  orgId,
}: Readonly<BillingInfoUpdateDialogProps>) {
  const { form, updateBillingInfo, isPending } =
    useSuperAdminSubscriptionBillingInfoUpdate({
      currentBillingInfo,
      orgId,
    });

  return (
    <SharedBillingInfoUpdateDialog
      trigger={trigger}
      translationNamespace="super-admin-settings-org"
      form={form}
      onUpdate={updateBillingInfo}
      isPending={isPending}
    />
  );
}
