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
import useFairUseLimitEditor from '@/features/fair-use-limit-editor/useFairUseLimitEditor';
import { SetFairUseLimitRequestDtoTier as Tier } from '@/shared/api';
import useFairUseLimits, {
  type FairUseTierLimit,
} from '../api/useFairUseLimits';
import useSetFairUseLimit from '../api/useSetFairUseLimit';

// `zero` tier is a first-class `ModelTier` value but exempt from fair-use
// enforcement (no quota bucket, no deduction at runtime). Skipping it at
// render-time keeps the UI in lockstep with the backend, which silently
// no-ops a `SetFairUseLimit` call for ZERO. Iterating `Object.values(Tier)`
// (rather than a hard-coded subset) means new tiers added to the enum
// surface here automatically.
function isConfigurableTier(tier: Tier): boolean {
  return tier !== Tier.zero;
}

interface TierRowProps {
  readonly tier: Tier;
  readonly current: FairUseTierLimit | undefined;
}

function TierRow({ tier, current }: TierRowProps) {
  const { t } = useTranslation('super-admin-settings-platform-config');
  const editor = useFairUseLimitEditor({
    current,
    validationKeyPrefix: 'fairUseLimits',
  });
  const { mutate, isPending } = useSetFairUseLimit({
    onSuccessCallback: editor.handleCancel,
  });

  const inputId = `fair-use-${tier}`;

  return (
    <div className="space-y-2 rounded-md border p-4">
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
              value={editor.limitValue}
              onChange={(e) => editor.updateField('limit', e.target.value)}
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
              value={editor.windowValue}
              onChange={(e) =>
                editor.updateField('windowHours', e.target.value)
              }
              disabled={isPending}
            />
          </div>
        </div>
        {editor.isEditing && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() =>
                editor.handleSave((values) => mutate({ tier, ...values }))
              }
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('fairUseLimits.save')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={editor.handleCancel}
              disabled={isPending}
            >
              {t('fairUseLimits.cancel')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FairUseLimitsSection() {
  const { t } = useTranslation('super-admin-settings-platform-config');
  const { low, medium, high, isLoading, isError } = useFairUseLimits();

  // Keyed by the full `Tier` enum — ZERO maps to `undefined` because the
  // backend does not return a row for it (no quota bucket). The render
  // loop filters ZERO out via `isConfigurableTier`, so this entry is never
  // read in practice; declaring it explicitly keeps the record exhaustive
  // over the enum and makes the "ZERO has no data" intent self-evident.
  const tierData: Record<Tier, FairUseTierLimit | undefined> = {
    [Tier.zero]: undefined,
    [Tier.low]: low,
    [Tier.medium]: medium,
    [Tier.high]: high,
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
            {Object.values(Tier)
              .filter(isConfigurableTier)
              .map((tier) => (
                <TierRow key={tier} tier={tier} current={tierData[tier]} />
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
