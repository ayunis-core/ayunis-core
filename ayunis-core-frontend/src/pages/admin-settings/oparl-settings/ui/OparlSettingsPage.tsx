import { useTranslation } from 'react-i18next';
import { AlertCircle, Landmark, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@ayunis/ui/components/alert';
import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ayunis/ui/components/empty';
import SettingsLayout from '@/pages/admin-settings/admin-settings-layout';
import { useOparlCatalogBodies } from '@/pages/admin-settings/oparl-settings/api/useOparlCatalogBodies';
import { OparlBodiesTable } from './OparlBodiesTable';

function CatalogBodies() {
  const { t } = useTranslation('admin-settings-oparl');
  const { bodies, isLoading, isError, refetch } = useOparlCatalogBodies();

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  if (isError)
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t('loadError')}
          <Button variant="link" onClick={() => void refetch()}>
            {t('retry')}
          </Button>
        </AlertDescription>
      </Alert>
    );
  if (bodies.length === 0)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Landmark />
          </EmptyMedia>
          <EmptyTitle>{t('empty.title')}</EmptyTitle>
          <EmptyDescription>{t('empty.description')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  return <OparlBodiesTable bodies={bodies} />;
}

export function OparlSettingsPage() {
  const { t } = useTranslation('admin-settings-oparl');
  return (
    <SettingsLayout title={t('title')}>
      <Card>
        <CardHeader>
          <CardTitle>{t('bodies.title')}</CardTitle>
          <CardDescription>{t('bodies.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <CatalogBodies />
        </CardContent>
      </Card>
    </SettingsLayout>
  );
}
