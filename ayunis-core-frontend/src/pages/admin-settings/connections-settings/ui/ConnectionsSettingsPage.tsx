import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription } from '@ayunis/ui/components/alert';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Skeleton } from '@ayunis/ui/components/skeleton';
import SettingsLayout from '@/pages/admin-settings/admin-settings-layout';
import { useConnectors } from '@/pages/admin-settings/connections-settings/api/useConnectors';
import {
  ConnectorStatus,
  type ConnectorProduct,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

const connectorPages = {
  microsoft_365: '/admin-settings/connections/microsoft-365',
} as const satisfies Record<ConnectorProduct, string>;

export function ConnectionsSettingsPage() {
  const { t } = useTranslation('admin-settings-connections');
  const { connectors, isLoading, error, refetch } = useConnectors();
  const failed = !isLoading && error !== null;

  return (
    <SettingsLayout title={t('connections.title')}>
      {isLoading && <Skeleton className="h-16 w-full" />}
      {failed && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('connections.loadError')}
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
      {!isLoading && !failed && (
        <div className="space-y-3">
          {connectors.map((connector) => (
            <Item
              key={connector.product}
              variant="outline"
              data-testid={`connections-connector-${connector.product}`}
              data-status={connector.status}
              asChild
            >
              <Link to={connectorPages[connector.product]}>
                <ItemContent>
                  <ItemTitle>
                    {t(`connections.products.${connector.product}`)}
                  </ItemTitle>
                </ItemContent>
                <ItemActions>
                  <Badge
                    variant={
                      connector.status === ConnectorStatus.set_up
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {t(`connections.status.${connector.status}`)}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </ItemActions>
              </Link>
            </Item>
          ))}
        </div>
      )}
    </SettingsLayout>
  );
}
