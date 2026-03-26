import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { SubscriptionResponseDto } from '@/shared/api';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/shadcn/dialog';
import { Form } from '@/shared/ui/shadcn/form';
import { Loader2 } from 'lucide-react';
import useSuperAdminSubscriptionStartDateUpdate from '../api/useSuperAdminSubscriptionStartDateUpdate';
import {
  buildSubscriptionStartDateSchema,
  toCalendarDateKey,
} from '../lib/subscription-start-date';
import type { UpdateSubscriptionStartDateFormData } from '../model/types';
import SubscriptionStartDateField from './SubscriptionStartDateField';

interface SubscriptionStartDateUpdateDialogProps {
  trigger: React.ReactNode;
  orgId: string;
  subscription: SubscriptionResponseDto;
}

export default function SubscriptionStartDateUpdateDialog({
  trigger,
  orgId,
  subscription,
}: Readonly<SubscriptionStartDateUpdateDialogProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const [open, setOpen] = useState(false);
  const form = useForm<UpdateSubscriptionStartDateFormData>({
    resolver: zodResolver(buildSubscriptionStartDateSchema(t)),
    defaultValues: { startsAt: subscription.startsAt },
  });
  const startsAt = useWatch({ control: form.control, name: 'startsAt' });
  const hasChanged =
    toCalendarDateKey(startsAt) !== toCalendarDateKey(subscription.startsAt);
  const { updateStartDate, isPending } =
    useSuperAdminSubscriptionStartDateUpdate({
      orgId,
      form,
      onSuccess: () => setOpen(false),
    });

  useEffect(() => {
    form.reset({ startsAt: subscription.startsAt });
  }, [form, subscription.startsAt]);

  const closeDialog = () => {
    setOpen(false);
    form.reset({ startsAt: subscription.startsAt });
  };

  const handleSubmit = form.handleSubmit(({ startsAt: nextStartsAt }) => {
    updateStartDate({ startsAt: nextStartsAt });
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : closeDialog())}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('subscription.updateStartDateTitle')}</DialogTitle>
          <DialogDescription>
            {t('subscription.updateStartDateDescription')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="space-y-6"
          >
            <SubscriptionStartDateField form={form} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={isPending}
              >
                {t('billingInfo.cancel')}
              </Button>
              <Button type="submit" disabled={isPending || !hasChanged}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPending
                  ? t('subscription.updatingStartDate')
                  : t('subscription.updateStartDateAction')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
