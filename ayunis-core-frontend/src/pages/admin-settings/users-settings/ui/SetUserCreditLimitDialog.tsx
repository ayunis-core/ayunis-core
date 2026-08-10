import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import { Button } from '@ayunis/ui/components/button';
import { Input } from '@ayunis/ui/components/input';
import { Label } from '@ayunis/ui/components/label';

interface SetUserCreditLimitDialogProps {
  open: boolean;
  targetName: string;
  initialMonthlyCredits?: number;
  isSaving: boolean;
  isRemoving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (monthlyCredits: number) => void;
  onRemove?: () => void;
}

interface FormValues {
  monthlyCredits?: number;
}

export function SetUserCreditLimitDialog({
  open,
  onOpenChange,
  targetName,
  initialMonthlyCredits,
  onSubmit,
  onRemove,
  isSaving,
  isRemoving,
}: Readonly<SetUserCreditLimitDialogProps>) {
  const { t } = useTranslation('admin-settings-credit-limits');
  const hasExistingLimit = initialMonthlyCredits !== undefined;
  const isBusy = isSaving || isRemoving;

  function handleOpenChange(next: boolean) {
    if (!next && isBusy) {
      return;
    }
    onOpenChange(next);
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { monthlyCredits: undefined } });

  useEffect(() => {
    if (open) {
      reset({ monthlyCredits: initialMonthlyCredits });
    }
  }, [open, initialMonthlyCredits, reset]);

  function submit(values: FormValues) {
    const credits = values.monthlyCredits;
    if (credits === undefined || Number.isNaN(credits)) {
      return;
    }

    onSubmit(credits);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={(e) => void handleSubmit(submit)(e)}>
          <DialogHeader>
            <DialogTitle>{t('creditLimits.dialog.userTitle')}</DialogTitle>
            <DialogDescription>
              {t('creditLimits.dialog.description', { name: targetName })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-4">
            <Label htmlFor="monthlyCredits">
              {t('creditLimits.dialog.creditsLabel')}
            </Label>
            <Input
              id="monthlyCredits"
              type="number"
              min={0}
              step={1}
              {...register('monthlyCredits', {
                valueAsNumber: true,
                required: t('creditLimits.dialog.creditsRequired'),
                validate: (v) =>
                  (v !== undefined && !Number.isNaN(v)) ||
                  t('creditLimits.dialog.creditsRequired'),
                min: { value: 0, message: t('creditLimits.dialog.creditsMin') },
              })}
            />
            <p className="text-muted-foreground text-xs">
              {t('creditLimits.dialog.creditsHint')}
            </p>
            {errors.monthlyCredits && (
              <p className="text-destructive text-sm">
                {errors.monthlyCredits.message}
              </p>
            )}
            {hasExistingLimit && onRemove && (
              <p className="text-muted-foreground text-xs">
                {t('creditLimits.dialog.removeHint')}
              </p>
            )}
          </div>

          <DialogFooter>
            {hasExistingLimit && onRemove && (
              <Button
                type="button"
                variant="destructive"
                className="sm:mr-auto"
                onClick={onRemove}
                disabled={isBusy}
              >
                {t('creditLimits.dialog.removeLimit')}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isBusy}
            >
              {t('creditLimits.dialog.cancel')}
            </Button>
            <Button type="submit" disabled={isBusy}>
              {t('creditLimits.dialog.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
