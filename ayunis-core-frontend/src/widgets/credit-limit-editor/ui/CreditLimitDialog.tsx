import { useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import { Input } from '@ayunis/ui/components/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import { useSaveCreditLimit } from '@/widgets/credit-limit-editor/api/useSaveCreditLimit';
import type {
  CreditLimitDialogProps,
  CreditLimitFields,
} from '@/widgets/credit-limit-editor/model/types';

export function CreditLimitDialog({
  target,
  id,
  name,
  initialLimit,
  onClose,
}: Readonly<CreditLimitDialogProps>) {
  const { t } = useTranslation('admin-settings-credit-limits');
  const form = useForm<CreditLimitFields>({
    defaultValues: {
      monthlyCredits: initialLimit === null ? '' : String(initialLimit),
    },
  });
  const mutation = useSaveCreditLimit(target, id, initialLimit !== null);
  const saving = useRef(false);
  const pending = form.formState.isSubmitting || mutation.isLoading;
  const save = async (value: number | null) => {
    if (saving.current) return;
    saving.current = true;
    try {
      if (await mutation.onSave(value, form)) onClose();
    } finally {
      saving.current = false;
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending && !saving.current) onClose();
      }}
    >
      <DialogContent
        className="sm:max-w-sm"
        showCloseButton={!pending}
        closeLabel={t('form.cancel')}
        data-testid="credit-limit-dialog"
      >
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription>{t('form.hint')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            noValidate
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!pending && !saving.current)
                void form.handleSubmit((values) =>
                  save(Number(values.monthlyCredits)),
                )();
            }}
          >
            <FormField
              control={form.control}
              name="monthlyCredits"
              rules={{
                validate: (value) =>
                  (value.trim() !== '' &&
                    Number.isFinite(Number(value)) &&
                    Number(value) >= 0) ||
                  t('validation.monthlyCredits.invalid'),
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.monthlyCredits')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min={0}
                      step="any"
                      disabled={pending}
                      data-testid="credit-limit-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              {initialLimit !== null && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      aria-label={t('form.remove')}
                      disabled={pending}
                      onClick={() => void save(null)}
                      data-testid="credit-limit-remove"
                      className="sm:mr-auto"
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('form.remove')}</TooltipContent>
                </Tooltip>
              )}
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={onClose}
                data-testid="credit-limit-cancel"
              >
                {t('form.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={pending}
                data-testid="credit-limit-save"
              >
                {t('form.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
