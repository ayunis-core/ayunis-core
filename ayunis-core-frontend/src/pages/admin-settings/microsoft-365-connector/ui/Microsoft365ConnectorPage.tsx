import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@ayunis/ui/components/alert';
import { Button } from '@ayunis/ui/components/button';
import { Skeleton } from '@ayunis/ui/components/skeleton';
import { ConnectorStatus } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import SettingsLayout from '@/pages/admin-settings/admin-settings-layout';
import { useMicrosoft365Connector } from '@/pages/admin-settings/microsoft-365-connector/api/useMicrosoft365Connector';
import { useTestMicrosoft365Connection } from '@/pages/admin-settings/microsoft-365-connector/api/useTestMicrosoft365Connection';
import { useLatestConnectionTest } from '@/pages/admin-settings/microsoft-365-connector/lib/useLatestConnectionTest';
import { Microsoft365ConnectorForm } from './Microsoft365ConnectorForm';
import { Microsoft365ConnectionTestCard } from './Microsoft365ConnectionTestCard';

export function Microsoft365ConnectorPage() {
  const { t } = useTranslation('admin-settings-connections');
  const { t: tLayout } = useTranslation('admin-settings-layout');
  const { connector, isLoading, error, refetch } = useMicrosoft365Connector();
  // A failed background refetch keeps the cached connector; only a load
  // without data replaces the form with the error.
  const failed = !isLoading && error !== null && !connector;
  const { connectionTest, startRequest, clearConnectionTest } =
    useLatestConnectionTest(connector?.status);
  const { testConnection, isTesting } =
    useTestMicrosoft365Connection(startRequest);

  return (
    <SettingsLayout
      breadcrumbs={[
        {
          label: tLayout('layout.integrations'),
          href: '/admin-settings/integrations',
        },
        { label: t('connections.products.microsoft_365') },
      ]}
    >
      {isLoading && <Skeleton className="h-64 w-full" />}
      {failed && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('microsoft365.loadError')}
            <Button
              variant="link"
              className="ml-2 h-auto p-0"
              onClick={() => void refetch()}
            >
              {t('connections.retry')}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {connector && (
        <div className="space-y-4">
          {/* Remounting on a status change resets the form and switches
              whether the secret is required. */}
          <Microsoft365ConnectorForm
            key={connector.status}
            connector={connector}
            startRequest={startRequest}
            onRemoved={clearConnectionTest}
          />
          {connector.status === ConnectorStatus.set_up && (
            <Microsoft365ConnectionTestCard
              result={connectionTest}
              onTest={testConnection}
              isTesting={isTesting}
            />
          )}
        </div>
      )}
    </SettingsLayout>
  );
}
