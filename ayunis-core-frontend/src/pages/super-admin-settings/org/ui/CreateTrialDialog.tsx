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
import useSuperAdminTrialCreate from '../api/useSuperAdminTrialCreate';

interface CreateTrialDialogProps {
  trigger: React.ReactNode;
  orgId: string;
}

export default function CreateTrialDialog({
  trigger,
  orgId,
}: Readonly<CreateTrialDialogProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const { form, handleSubmit } = useSuperAdminTrialCreate({ orgId });

  const handleCancel = () => {
    form.reset();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t('trialDialog.title')}</DialogTitle>
          <DialogDescription>{t('trialDialog.description')}</DialogDescription>
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
                  <FormLabel>{t('trialDialog.maxMessagesLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={t('trialDialog.maxMessagesPlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('trialDialog.maxMessagesDescription')}
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
                  disabled={form.formState.isSubmitting}
                >
                  {t('billingInfo.cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? t('trialDialog.creating')
                  : t('trialDialog.createTrial')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
