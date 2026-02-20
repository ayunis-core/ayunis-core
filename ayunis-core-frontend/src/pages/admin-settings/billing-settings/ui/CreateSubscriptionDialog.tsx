import SharedCreateSubscriptionDialog from '@/widgets/billing/ui/CreateSubscriptionDialog';
import useSubscriptionCreate from '../api/useSubscriptionCreate';
import { useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { PriceResponseDto } from '@/shared/api';

interface CreateSubscriptionDialogProps {
  trigger: React.ReactNode;
  subscriptionPrice: PriceResponseDto;
}

export default function CreateSubscriptionDialog({
  trigger,
  subscriptionPrice,
}: Readonly<CreateSubscriptionDialogProps>) {
  const { t } = useTranslation('admin-settings-billing');
  const { form, handleSubmit } = useSubscriptionCreate();

  const noOfSeats = useWatch({
    control: form.control,
    name: 'noOfSeats',
  });

  const priceSection = (
    <>
      <div className="text-center py-4 border-b">
        <p className="text-sm text-muted-foreground text-center">
          {t('subscriptionDialog.totalPrice', {
            price: subscriptionPrice.pricePerSeatMonthly * (noOfSeats || 1),
          })}
        </p>
      </div>
      <p className="text-sm text-muted-foreground text-center">
        {t('subscriptionDialog.paymentMethodHint')}
      </p>
    </>
  );

  return (
    <SharedCreateSubscriptionDialog
      trigger={trigger}
      translationNamespace="admin-settings-billing"
      form={form}
      onSubmit={handleSubmit}
      priceSection={priceSection}
    />
  );
}
