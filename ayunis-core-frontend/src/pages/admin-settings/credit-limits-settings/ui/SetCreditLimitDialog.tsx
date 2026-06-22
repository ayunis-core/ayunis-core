import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { useSetCreditLimit } from '../api/useSetCreditLimit';
import type { CreditLimitScope } from '../model/types';

interface TargetOption {
  id: string;
  name: string;
}

interface SetCreditLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: CreditLimitScope;
  mode: 'create' | 'edit';
  /** Preset target for edit mode. */
  target?: TargetOption;
  initialMonthlyCredits?: number;
  /** Selectable targets (without a limit yet) for create mode. */
  options?: TargetOption[];
}

interface FormValues {
  targetId: string;
  monthlyCredits: number;
}

export function SetCreditLimitDialog({
  open,
  onOpenChange,
  scope,
  mode,
  target,
  initialMonthlyCredits,
  options = [],
}: Readonly<SetCreditLimitDialogProps>) {
  const { t } = useTranslation('admin-settings-credit-limits');
  const { setUserLimit, setTeamLimit, isSaving } = useSetCreditLimit(() =>
    onOpenChange(false),
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { targetId: '', monthlyCredits: 0 },
  });

  useEffect(() => {
    if (open) {
      reset({
        targetId: target?.id ?? '',
        monthlyCredits: initialMonthlyCredits ?? 0,
      });
    }
  }, [open, target, initialMonthlyCredits, reset]);

  function onSubmit(values: FormValues) {
    const targetId = mode === 'edit' ? (target?.id ?? '') : values.targetId;
    if (!targetId) return;
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
              {t('creditLimits.dialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {mode === 'create' ? (
              <div className="grid gap-2">
                <Label htmlFor="targetId">
                  {scope === 'user'
                    ? t('creditLimits.dialog.userLabel')
                    : t('creditLimits.dialog.teamLabel')}
                </Label>
                <Controller
                  control={control}
                  name="targetId"
                  rules={{ required: t('creditLimits.dialog.targetRequired') }}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="targetId">
                        <SelectValue
                          placeholder={t(
                            'creditLimits.dialog.targetPlaceholder',
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.targetId && (
                  <p className="text-destructive text-sm">
                    {errors.targetId.message}
                  </p>
                )}
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>
                  {scope === 'user'
                    ? t('creditLimits.dialog.userLabel')
                    : t('creditLimits.dialog.teamLabel')}
                </Label>
                <p className="text-sm font-medium">{target?.name}</p>
              </div>
            )}

            <div className="grid gap-2">
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
                  min: {
                    value: 0,
                    message: t('creditLimits.dialog.creditsMin'),
                  },
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
