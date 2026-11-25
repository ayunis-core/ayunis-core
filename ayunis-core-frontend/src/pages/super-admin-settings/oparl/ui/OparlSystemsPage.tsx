import { useTranslation } from 'react-i18next';
import { AlertCircle, Landmark, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@ayunis/ui/components/alert';
import { Button } from '@ayunis/ui/components/button';
import { Card, CardContent } from '@ayunis/ui/components/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ayunis/ui/components/empty';
import SuperAdminSettingsLayout from '@/pages/super-admin-settings/super-admin-settings-layout';
import { useOparlSystems } from '@/pages/super-admin-settings/oparl/api/useOparlSystems';
import { AddOparlSystemCard } from './AddOparlSystemCard';
import { OparlSystemCard } from './OparlSystemCard';

function SystemList() {
  const { t } = useTranslation('super-admin-settings-oparl');
  const { systems, isLoading, isError, refetch } = useOparlSystems();

  if (isLoading)
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
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
  if (systems.length === 0)
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
  return (
    <>
      {systems.map((system) => (
        <OparlSystemCard key={system.id} system={system} />
      ))}
    </>
  );
}

export default function OparlSystemsPage() {
  const { t } = useTranslation('super-admin-settings-oparl');
  return (
    <SuperAdminSettingsLayout pageTitle={t('title')}>
      <div className="space-y-6">
        <AddOparlSystemCard />
        <SystemList />
      </div>
    </SuperAdminSettingsLayout>
  );
}
