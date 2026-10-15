import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Alert, AlertDescription } from '@ayunis/ui/components/alert';
import { useRolePermissionsControllerGet } from '@/shared/api';
import { buildDraft } from '@/pages/admin-settings/roles-settings/lib/role-permissions-draft';
import { PermissionsMatrix } from './PermissionsMatrix';

export function PermissionsCard() {
  const { t } = useTranslation('admin-settings-roles');
  const { data, isLoading, isError, refetch } =
    useRolePermissionsControllerGet();
  const serverDraft = useMemo(() => buildDraft(data?.roles ?? []), [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('matrix.title')}</CardTitle>
        <CardDescription>{t('matrix.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('loadError')}
              <Button
                variant="link"
                className="ml-2 h-auto p-0"
                onClick={() => void refetch()}
              >
                {t('retry')}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {!isLoading && !isError && (
          <PermissionsMatrix serverDraft={serverDraft} />
        )}
      </CardContent>
    </Card>
  );
}
