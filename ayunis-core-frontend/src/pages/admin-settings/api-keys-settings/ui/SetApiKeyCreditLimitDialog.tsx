import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { Input } from '@ayunis/ui/components/input';
import { useRemoveApiKeyCreditLimit } from '@/pages/admin-settings/api-keys-settings/api/useRemoveApiKeyCreditLimit';
import { useSetApiKeyCreditLimit } from '@/pages/admin-settings/api-keys-settings/api/useSetApiKeyCreditLimit';
import type {
  ApiKey,
  ApiKeyCreditLimit,
  ApiKeyCreditLimitFormValues,
} from '@/pages/admin-settings/api-keys-settings/model/types';

interface SetApiKeyCreditLimitDialogProps {
  apiKey: ApiKey | null;
  creditLimit?: ApiKeyCreditLimit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SetApiKeyCreditLimitDialog({
  apiKey,
  creditLimit,
  open,
  onOpenChange,
}: Readonly<SetApiKeyCreditLimitDialogProps>) {
  const { t } = useTranslation('admin-settings-api-keys');
  const form = useForm<ApiKeyCreditLimitFormValues>({
    defaultValues: { monthlyCredits: undefined },
  });
  const close = () => onOpenChange(false);
  const { setApiKeyCreditLimit, isSaving } = useSetApiKeyCreditLimit(
    form,
    close,
  );
  const { removeApiKeyCreditLimit, isRemoving } =
    useRemoveApiKeyCreditLimit(close);

  useEffect(() => {
    if (open) {
      form.reset({ monthlyCredits: creditLimit?.monthlyCredits });
    }
  }, [creditLimit?.monthlyCredits, form, open]);

  if (!apiKey) {
    return null;
  }

  const submit = ({ monthlyCredits }: ApiKeyCreditLimitFormValues) => {
    if (monthlyCredits === undefined || Number.isNaN(monthlyCredits)) {
      return;
    }
    setApiKeyCreditLimit(apiKey.id, monthlyCredits);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[425px]"
        data-testid="api-key-credit-limit-dialog"
      >
        <Form {...form}>
          <form onSubmit={(event) => void form.handleSubmit(submit)(event)}>
            <DialogHeader>
              <DialogTitle>{t('apiKeys.creditLimit.title')}</DialogTitle>
              <DialogDescription>
                {t('apiKeys.creditLimit.description', { name: apiKey.name })}
              </DialogDescription>
            </DialogHeader>

            <FormField
              control={form.control}
              name="monthlyCredits"
              rules={{
                required: t('apiKeys.creditLimit.creditsRequired'),
                validate: (value) =>
                  (value !== undefined && !Number.isNaN(value)) ||
                  t('apiKeys.creditLimit.creditsRequired'),
                min: {
                  value: 0,
                  message: t('apiKeys.creditLimit.creditsMin'),
                },
              }}
              render={({ field }) => (
                <FormItem className="py-4">
                  <FormLabel>{t('apiKeys.creditLimit.creditsLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min={0}
                      step={1}
                      value={field.value ?? ''}
                      onChange={(event) =>
                        field.onChange(
                          event.currentTarget.value === ''
                            ? undefined
                            : event.currentTarget.valueAsNumber,
                        )
                      }
                      data-testid="api-key-credit-limit-input"
                    />
                  </FormControl>
                  <FormDescription>
                    {t('apiKeys.creditLimit.creditsHint')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="sm:justify-between">
              {creditLimit ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isRemoving || isSaving}
                  onClick={() => removeApiKeyCreditLimit(apiKey.id)}
                  data-testid="api-key-credit-limit-dialog-remove"
                >
                  {t('apiKeys.creditLimit.remove')}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={close}
                  disabled={isSaving || isRemoving}
                >
                  {t('apiKeys.creditLimit.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving || isRemoving}
                  data-testid="api-key-credit-limit-save"
                >
                  {t('apiKeys.creditLimit.save')}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
