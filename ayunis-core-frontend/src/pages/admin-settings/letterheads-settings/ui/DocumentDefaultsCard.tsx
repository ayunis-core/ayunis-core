import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Skeleton } from '@ayunis/ui/components/skeleton';
import {
  getDocumentDefaultsControllerFindQueryKey,
  useDocumentDefaultsControllerFind,
  useDocumentDefaultsControllerUpdate,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { DocumentTypography } from '@/shared/lib/document-typography';
import { showError, showSuccess } from '@/shared/lib/toast';
import { DocumentTypographyFields } from '@/shared/ui/document-typography-fields';

export function DocumentDefaultsCard() {
  const { t } = useTranslation('admin-settings-letterheads');
  const queryClient = useQueryClient();
  const { data: defaults, isError } = useDocumentDefaultsControllerFind();
  const [draft, setDraft] = useState<Partial<DocumentTypography>>({});
  const { mutate, isPending } = useDocumentDefaultsControllerUpdate({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(
          getDocumentDefaultsControllerFindQueryKey(),
          data,
        );
        setDraft({});
        showSuccess(t('typography.saved'));
      },
      onError: () => showError(t('typography.saveError')),
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('typography.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {!defaults && isError && (
          <p role="alert" className="text-sm text-destructive">
            {t('typography.loadError')}
          </p>
        )}
        {!defaults && !isError && <Skeleton className="h-20 w-full" />}
        {defaults && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              mutate({ data: draft });
            }}
          >
            <DocumentTypographyFields
              value={{ ...defaults, ...draft }}
              onChange={(patch) =>
                setDraft((previous) => ({ ...previous, ...patch }))
              }
              scope="organization"
              disabled={isPending}
            />
            <Button
              type="submit"
              disabled={isPending || Object.keys(draft).length === 0}
            >
              {t(
                isPending
                  ? 'letterheads.editDialog.saving'
                  : 'letterheads.editDialog.save',
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
