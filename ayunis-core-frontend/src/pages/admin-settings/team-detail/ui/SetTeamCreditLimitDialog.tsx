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
} from '@/shared/ui/shadcn/dialog';
import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';

interface SetTeamCreditLimitDialogProps {
  open: boolean;
  targetName: string;
  initialMonthlyCredits?: number;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (monthlyCredits: number) => void;
}

interface FormValues {
  monthlyCredits?: number;
}

export function SetTeamCreditLimitDialog({
  open,
  onOpenChange,
  targetName,
  initialMonthlyCredits,
  onSubmit,
  isSaving,
}: Readonly<SetTeamCreditLimitDialogProps>) {
  const { t } = useTranslation('admin-settings-credit-limits');

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={(e) => void handleSubmit(submit)(e)}>
          <DialogHeader>
            <DialogTitle>{t('creditLimits.dialog.teamTitle')}</DialogTitle>
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
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('creditLimits.dialog.cancel')}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {t('creditLimits.dialog.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
