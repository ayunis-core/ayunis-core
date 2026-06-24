import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';
import SettingsLayout from '../../admin-settings-layout';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Alert, AlertDescription } from '@/shared/ui/shadcn/alert';
import {
  useAnonymizationSettingsControllerGet,
  useAnonymizationSettingsControllerUpdate,
  getAnonymizationSettingsControllerGetQueryKey,
} from '@/shared/api';
import type { PiiCategory } from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showSuccess, showError } from '@/shared/lib/toast';
import { PII_CATEGORIES } from '../model/types';
import type { CategoryRowState, RowsState } from '../model/types';
import { buildRows, toEntries, validateRows } from '../lib/rows';
import type { RowErrors } from '../lib/rows';
import { PiiCategoryRow } from './PiiCategoryRow';

export function AnonymizationSettingsPage() {
  const { t: tLayout } = useTranslation('admin-settings-layout');
  const { t } = useTranslation('admin-settings-anonymization');
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } =
    useAnonymizationSettingsControllerGet();
  const serverRows = useMemo(() => buildRows(data?.entries ?? []), [data]);

  const [draft, setDraft] = useState<RowsState | null>(null);
  const [errors, setErrors] = useState<RowErrors>({});
  const rows = draft ?? serverRows;

  const updateMutation = useAnonymizationSettingsControllerUpdate();

  function handleRowChange(category: PiiCategory, row: CategoryRowState) {
    setDraft({ ...rows, [category]: row });
    if (errors[category]) {
      setErrors({ ...errors, [category]: undefined });
    }
  }

  function handleSave() {
    const validationErrors = validateRows(rows);
    setErrors(validationErrors);
    if (Object.values(validationErrors).some(Boolean)) {
      return;
    }

    updateMutation.mutate(
      { data: { entries: toEntries(rows) } },
      {
        onSuccess: (updated) => {
          showSuccess(t('piiWhitelist.saveSuccess'));
          queryClient.setQueryData(
            getAnonymizationSettingsControllerGetQueryKey(),
            updated,
          );
          setDraft(null);
          void queryClient.invalidateQueries({
            queryKey: getAnonymizationSettingsControllerGetQueryKey(),
          });
        },
        onError: (error) => {
          handleMutationError(error);
        },
      },
    );
  }

  function handleMutationError(error: unknown) {
    try {
      const { code } = extractErrorData(error);
      showError(
        code === 'INVALID_PATTERN'
          ? t('piiWhitelist.unsafePattern')
          : t('piiWhitelist.saveError'),
      );
    } catch {
      showError(t('piiWhitelist.saveError'));
    }
  }

  if (isLoading) {
    return (
      <SettingsLayout title={tLayout('layout.anonymization')}>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </SettingsLayout>
    );
  }

  if (isError) {
    return (
      <SettingsLayout title={tLayout('layout.anonymization')}>
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('piiWhitelist.loadError')}
                <Button
                  variant="link"
                  className="ml-2 h-auto p-0"
                  onClick={() => void refetch()}
                >
                  {t('piiWhitelist.retry')}
                </Button>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout title={tLayout('layout.anonymization')}>
      <Card>
        <CardHeader>
          <CardTitle>{t('piiWhitelist.heading')}</CardTitle>
          <CardDescription>{t('piiWhitelist.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {PII_CATEGORIES.map((category) => (
            <PiiCategoryRow
              key={category}
              category={category}
              row={rows[category]}
              error={errors[category]}
              disabled={updateMutation.isPending}
              onChange={(row) => handleRowChange(category, row)}
            />
          ))}

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending || draft === null}
            >
              {updateMutation.isPending
                ? t('piiWhitelist.saving')
                : t('piiWhitelist.saveButton')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </SettingsLayout>
  );
}
