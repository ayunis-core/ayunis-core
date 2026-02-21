import { CreateSubscriptionDialog as SharedCreateSubscriptionDialog } from '@/widgets/billing';
import useSuperAdminSubscriptionCreate from '../api/useSuperAdminSubscriptionCreate';
import { useTranslation } from 'react-i18next';

interface CreateSubscriptionDialogProps {
  trigger: React.ReactNode;
  orgId: string;
}

export default function CreateSubscriptionDialog({
  trigger,
  orgId,
}: Readonly<CreateSubscriptionDialogProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const { form, handleSubmit } = useSuperAdminSubscriptionCreate({ orgId });

  return (
    <SharedCreateSubscriptionDialog
      trigger={trigger}
      translationNamespace="super-admin-settings-org"
      form={form}
      onSubmit={handleSubmit}
      submittingLabel={t('subscriptionDialog.creating')}
    />
  );
}
