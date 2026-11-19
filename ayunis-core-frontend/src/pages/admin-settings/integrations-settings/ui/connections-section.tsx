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
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Skeleton } from '@ayunis/ui/components/skeleton';
import { useConnectors } from '@/pages/admin-settings/integrations-settings/api/useConnectors';
import {
  ConnectorStatus,
  type ConnectorProduct,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

const connectorPages = {
  microsoft_365: '/admin-settings/integrations/microsoft-365',
} as const satisfies Record<ConnectorProduct, string>;

export function ConnectionsSection() {
  const { t } = useTranslation('admin-settings-connections');
  const { connectors, isLoading, error, refetch } = useConnectors();
  const failed = !isLoading && error !== null;

  return (
    <section className="space-y-4" data-testid="connections-section">
      <h2 className="text-lg font-semibold">{t('connections.title')}</h2>
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
      {!isLoading &&
        !failed &&
        connectors.map((connector) => (
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
                <ItemDescription>
                  {t(`connections.descriptions.${connector.product}`)}
                </ItemDescription>
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
    </section>
  );
}
