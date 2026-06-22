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
import { useSetCreditLimit } from '../api/useSetCreditLimit';
import type { CreditLimitScope } from '../model/types';

interface SetCreditLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: CreditLimitScope;
  targetId: string;
  targetName: string;
  /** Present when editing an existing limit; absent when setting a new one. */
  initialMonthlyCredits?: number;
}

interface FormValues {
  monthlyCredits: number;
}

export function SetCreditLimitDialog({
  open,
  onOpenChange,
  scope,
  targetId,
  targetName,
  initialMonthlyCredits,
}: Readonly<SetCreditLimitDialogProps>) {
  const { t } = useTranslation('admin-settings-credit-limits');
  const { setUserLimit, setTeamLimit, isSaving } = useSetCreditLimit(() =>
    onOpenChange(false),
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { monthlyCredits: 0 } });

  useEffect(() => {
    if (open) {
      reset({ monthlyCredits: initialMonthlyCredits ?? 0 });
    }
  }, [open, initialMonthlyCredits, reset]);

  function onSubmit(values: FormValues) {
    if (scope === 'user') {
      setUserLimit(targetId, values.monthlyCredits);
    } else {
      setTeamLimit(targetId, values.monthlyCredits);
    }
  }

  const title =
    scope === 'user'
      ? t('creditLimits.dialog.userTitle')
      : t('creditLimits.dialog.teamTitle');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
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
