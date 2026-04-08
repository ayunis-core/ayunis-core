import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Input } from '@/shared/ui/shadcn/input';
import { Button } from '@/shared/ui/shadcn/button';
import { Label } from '@/shared/ui/shadcn/label';
import { Alert, AlertDescription } from '@/shared/ui/shadcn/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { showError } from '@/shared/lib/toast';
import { SetFairUseLimitRequestDtoTier as Tier } from '@/shared/api';
import useFairUseLimits, {
  type FairUseTierLimit,
} from '../api/useFairUseLimits';
import useSetFairUseLimit from '../api/useSetFairUseLimit';

const TIERS: Tier[] = [Tier.low, Tier.medium, Tier.high];

const MIN_WINDOW_HOURS = 0.01;

interface RowEditState {
  limit: string;
  windowHours: string;
}

interface TierRowProps {
  readonly tier: Tier;
  readonly current: FairUseTierLimit | undefined;
}

function isValidLimit(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && Number.isInteger(parsed) && parsed > 0;
}

function isValidWindowHours(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= MIN_WINDOW_HOURS;
}

function toEditState(current: FairUseTierLimit | undefined): RowEditState {
  return {
    limit: String(current?.limit ?? ''),
    windowHours: String(current?.windowHours ?? ''),
  };
}

function TierRow({ tier, current }: TierRowProps) {
  const { t } = useTranslation('super-admin-settings-platform-config');
  const [edit, setEdit] = useState<RowEditState | null>(null);
  const { mutate, isPending } = useSetFairUseLimit({
    onSuccessCallback: () => setEdit(null),
  });

  const isEditing = edit !== null;
  const limitValue = isEditing ? edit.limit : String(current?.limit ?? '');
  const windowValue = isEditing
    ? edit.windowHours
    : String(current?.windowHours ?? '');

  function updateField(field: 'limit' | 'windowHours', value: string) {
    setEdit((prev) => ({ ...(prev ?? toEditState(current)), [field]: value }));
  }

  function handleSave() {
    if (!isEditing) return;

    if (!isValidLimit(edit.limit)) {
      showError(t('fairUseLimits.validationError.limit'));
      return;
    }
    if (!isValidWindowHours(edit.windowHours)) {
      showError(t('fairUseLimits.validationError.windowHours'));
      return;
    }

    mutate({
      tier,
      limit: Number(edit.limit),
      windowHours: Number(edit.windowHours),
    });
  }

  function handleCancel() {
    setEdit(null);
  }

  const inputId = `fair-use-${tier}`;

  return (
    <Card className="space-y-2 p-4">
      <h4 className="text-sm font-medium">{t(`fairUseLimits.tier.${tier}`)}</h4>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor={`${inputId}-limit`}>{t('fairUseLimits.limit')}</Label>
          <div className="w-32">
            <Input
              id={`${inputId}-limit`}
              type="number"
              min="1"
              step="1"
              value={limitValue}
              onChange={(e) => updateField('limit', e.target.value)}
              disabled={isPending}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${inputId}-window`}>
            {t('fairUseLimits.windowHours')}
          </Label>
          <div className="w-32">
            <Input
              id={`${inputId}-window`}
              type="number"
              min="0.01"
              step="any"
              value={windowValue}
              onChange={(e) => updateField('windowHours', e.target.value)}
              disabled={isPending}
            />
          </div>
        </div>
        {isEditing && (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('fairUseLimits.save')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
            >
              {t('fairUseLimits.cancel')}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function FairUseLimitsSection() {
  const { t } = useTranslation('super-admin-settings-platform-config');
  const { low, medium, high, isLoading, isError } = useFairUseLimits();

  const tierData: Record<Tier, FairUseTierLimit | undefined> = {
    low,
    medium,
    high,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('fairUseLimits.title')}</CardTitle>
        <CardDescription>{t('fairUseLimits.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t('fairUseLimits.loadError')}</AlertDescription>
          </Alert>
        )}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('fairUseLimits.loading')}
          </div>
        )}
        {!isLoading && !isError && (
          <div className="space-y-3">
            {TIERS.map((tier) => (
              <TierRow key={tier} tier={tier} current={tierData[tier]} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
