import { Button } from '@/shared/ui/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/shared/ui/shadcn/dialog';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSuperAdminSubscriptionMonthlyCreditsUpdate from '../api/useSuperAdminSubscriptionMonthlyCreditsUpdate';

interface CreditBudgetUpdateDialogProps {
  orgId: string;
  monthlyCredits: number;
  trigger: React.ReactNode;
}

export default function CreditBudgetUpdateDialog({
  orgId,
  monthlyCredits,
  trigger,
}: Readonly<CreditBudgetUpdateDialogProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const { updateMonthlyCredits, isPending } =
    useSuperAdminSubscriptionMonthlyCreditsUpdate(orgId);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(monthlyCredits));

  const parsed = Number(value);
  const isValid =
    value.trim() !== '' && Number.isInteger(parsed) && parsed >= 0;
  const isUnchanged = parsed === monthlyCredits;

  function handleOpenChange(next: boolean) {
    // Reset to the current budget whenever the dialog opens so a previously
    // abandoned edit is never carried over (the dialog stays mounted).
    if (next) {
      setValue(String(monthlyCredits));
    }
    setOpen(next);
  }

  function handleUpdate() {
    if (!isValid) {
      return;
    }
    updateMonthlyCredits(parsed, { onSuccess: () => setOpen(false) });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('creditBudget.updateTitle')}</DialogTitle>
          <DialogDescription>
            {t('creditBudget.updateDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="monthly-credits">
            {t('creditBudget.updateLabel')}
          </Label>
          <Input
            id="monthly-credits"
            type="number"
            min={0}
            step={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button
            disabled={!isValid || isUnchanged || isPending}
            onClick={handleUpdate}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('creditBudget.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
