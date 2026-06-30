import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/shadcn/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/shadcn/alert-dialog';
import { Form } from '@/shared/ui/shadcn/form';
import { Button } from '@/shared/ui/shadcn/button';
import { ScrollArea } from '@/shared/ui/shadcn/scroll-area';
import { SubscriptionFormFields } from '@/widgets/billing';
import { ChangeSubscriptionRequestDtoOldSubscriptionDisposition } from '@/shared/api';
import { useTranslation } from 'react-i18next';
import useSuperAdminSubscriptionChange from '../api/useSuperAdminSubscriptionChange';

interface ChangeSubscriptionDialogProps {
  trigger: React.ReactNode;
  orgId: string;
}

export default function ChangeSubscriptionDialog({
  trigger,
  orgId,
}: Readonly<ChangeSubscriptionDialogProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const [open, setOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);

  const { form, confirmChange, isPending } = useSuperAdminSubscriptionChange({
    orgId,
    onSuccess: () => {
      setWarningOpen(false);
      setOpen(false);
      form.reset();
    },
  });

  // Validate the form first; only open the destructive warning when it passes.
  const handleContinue = form.handleSubmit(() => setWarningOpen(true));

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('changeSubscriptionDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('changeSubscriptionDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px]">
            <Form {...form}>
              <form
                onSubmit={(e) => {
                  void handleContinue(e);
                }}
                className="space-y-6"
              >
                <SubscriptionFormFields form={form} t={t} />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={isPending}
                  >
                    {t('changeSubscriptionDialog.back')}
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {t('changeSubscriptionDialog.continue')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={warningOpen} onOpenChange={setWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('changeSubscriptionDialog.warningTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('changeSubscriptionDialog.warningDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            <Button
              variant="destructive"
              onClick={() =>
                confirmChange(
                  ChangeSubscriptionRequestDtoOldSubscriptionDisposition.CANCEL,
                )
              }
              disabled={isPending}
            >
              {t('changeSubscriptionDialog.confirmCancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                confirmChange(
                  ChangeSubscriptionRequestDtoOldSubscriptionDisposition.DELETE,
                )
              }
              disabled={isPending}
            >
              {t('changeSubscriptionDialog.confirmDelete')}
            </Button>
            <Button
              variant="outline"
              onClick={() => setWarningOpen(false)}
              disabled={isPending}
            >
              {t('changeSubscriptionDialog.back')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
