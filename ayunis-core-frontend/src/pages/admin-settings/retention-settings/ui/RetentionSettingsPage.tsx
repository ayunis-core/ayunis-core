import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';
import SettingsLayout from '../../admin-settings-layout';
import { Button } from '@/shared/ui/shadcn/button';
import { Label } from '@/shared/ui/shadcn/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Alert, AlertDescription } from '@/shared/ui/shadcn/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/shadcn/alert-dialog';
import {
  useRetentionPoliciesControllerGet,
  useRetentionPoliciesControllerUpdate,
  getRetentionPoliciesControllerGetQueryKey,
} from '@/shared/api';
import type { UpdateRetentionPolicyRequestDtoRetentionDays } from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showSuccess, showError } from '@/shared/lib/toast';
import { formatRetentionPeriod, isMoreAggressive } from '../lib/format-period';

const KEEP_FOREVER = 'keep-forever';

function toSelectValue(retentionDays: number | null): string {
  return retentionDays === null ? KEEP_FOREVER : String(retentionDays);
}

function fromSelectValue(value: string): number | null {
  return value === KEEP_FOREVER ? null : Number(value);
}

export function RetentionSettingsPage() {
  const { t: tLayout } = useTranslation('admin-settings-layout');
  const { t } = useTranslation('admin-settings-retention');
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } =
    useRetentionPoliciesControllerGet();
  const updateMutation = useRetentionPoliciesControllerUpdate();

  const serverValue = data?.retentionDays ?? null;
  const [draft, setDraft] = useState<number | null | undefined>(undefined);
  const selected = draft === undefined ? serverValue : draft;
  const isDirty = draft !== undefined && draft !== serverValue;
  const [confirmOpen, setConfirmOpen] = useState(false);

  function persist(retentionDays: number | null) {
    updateMutation.mutate(
      {
        // Values come from the server's allowlist (or null), so they always
        // satisfy the generated enum union.
        data: {
          retentionDays:
            retentionDays as UpdateRetentionPolicyRequestDtoRetentionDays,
        },
      },
      {
        onSuccess: (updated) => {
          showSuccess(t('retention.saveSuccess'));
          queryClient.setQueryData(
            getRetentionPoliciesControllerGetQueryKey(),
            updated,
          );
          setDraft(undefined);
          void queryClient.invalidateQueries({
            queryKey: getRetentionPoliciesControllerGetQueryKey(),
          });
        },
        onError: handleMutationError,
      },
    );
  }

  function handleSave() {
    // Confirm only when the change starts or intensifies deletion.
    if (isMoreAggressive(serverValue, selected)) {
      setConfirmOpen(true);
      return;
    }
    persist(selected);
  }

  function handleConfirm() {
    setConfirmOpen(false);
    persist(selected);
  }

  function handleMutationError(error: unknown) {
    try {
      const { code } = extractErrorData(error);
      showError(
        code === 'INVALID_RETENTION_PERIOD'
          ? t('retention.invalidPeriod')
          : t('retention.saveError'),
      );
    } catch {
      showError(t('retention.saveError'));
    }
  }

  if (isLoading) {
    return (
      <SettingsLayout title={tLayout('layout.retention')}>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </SettingsLayout>
    );
  }

  if (isError || !data) {
    return (
      <SettingsLayout title={tLayout('layout.retention')}>
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('retention.loadError')}
                <Button
                  variant="link"
                  className="ml-2 h-auto p-0"
                  onClick={() => void refetch()}
                >
                  {t('retention.retry')}
                </Button>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout title={tLayout('layout.retention')}>
      <Card>
        <CardHeader>
          <CardTitle>{t('retention.heading')}</CardTitle>
          <CardDescription>{t('retention.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="retention-period">
              {t('retention.periodLabel')}
            </Label>
            <Select
              value={toSelectValue(selected)}
              onValueChange={(value) => setDraft(fromSelectValue(value))}
              disabled={updateMutation.isPending}
            >
              <SelectTrigger id="retention-period" className="w-[320px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={KEEP_FOREVER}>
                  {t('retention.keepForever')}
                </SelectItem>
                {data.allowedRetentionDays.map((days) => (
                  <SelectItem key={days} value={String(days)}>
                    {formatRetentionPeriod(days, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected === null && (
              <p className="text-sm text-muted-foreground">
                {t('retention.currentlyDisabled')}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending || !isDirty}
            >
              {updateMutation.isPending
                ? t('retention.saving')
                : t('retention.saveButton')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('retention.confirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('retention.confirm.body', {
                period:
                  selected === null ? '' : formatRetentionPeriod(selected, t),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('retention.confirm.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {t('retention.confirm.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsLayout>
  );
}
