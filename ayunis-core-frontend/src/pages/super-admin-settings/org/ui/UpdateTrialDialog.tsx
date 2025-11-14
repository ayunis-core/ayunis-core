import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/shadcn/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import { Input } from '@/shared/ui/shadcn/input';
import { Button } from '@/shared/ui/shadcn/button';
import { useTranslation } from 'react-i18next';
import type { SuperAdminTrialResponseDto } from '@/shared/api';
import useSuperAdminTrialUpdate from '../api/useSuperAdminTrialUpdate';

interface UpdateTrialDialogProps {
  trigger: React.ReactNode;
  orgId: string;
  trial: SuperAdminTrialResponseDto;
}

export default function UpdateTrialDialog({
  trigger,
  orgId,
  trial,
}: UpdateTrialDialogProps) {
  const { t } = useTranslation('super-admin-settings-org');
  const { form, handleSubmit, isPending } = useSuperAdminTrialUpdate({
    orgId,
    trial,
  });

  const handleCancel = () => {
    form.reset();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{t('trialUpdateDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('trialUpdateDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="maxMessages"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('trialUpdateDialog.maxMessagesLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={t(
                        'trialUpdateDialog.maxMessagesPlaceholder',
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('trialUpdateDialog.maxMessagesDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="messagesSent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('trialUpdateDialog.messagesSentLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={t(
                        'trialUpdateDialog.messagesSentPlaceholder',
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('trialUpdateDialog.messagesSentDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isPending}
                >
                  {t('billingInfo.cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? t('trialUpdateDialog.updating')
                  : t('trialUpdateDialog.updateTrial')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
