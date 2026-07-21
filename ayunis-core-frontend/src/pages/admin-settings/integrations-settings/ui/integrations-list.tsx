import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/shared/ui/shadcn/card';
import { Button } from '@/shared/ui/shadcn/button';
import { ExternalLink, FileQuestion, Store } from 'lucide-react';
import type { McpIntegration } from '../model/types';
import { IntegrationCard } from './integration-card';
import { useToggleIntegration } from '../api/useToggleIntegration';
import { useValidateIntegration } from '../api/useValidateIntegration';
import { useMarketplaceConfig } from '@/features/marketplace';

interface IntegrationsListProps {
  integrations: McpIntegration[];
  onEdit: (integration: McpIntegration) => void;
  onDelete: (integration: McpIntegration) => void;
}

export function IntegrationsList({
  integrations,
  onEdit,
  onDelete,
}: Readonly<IntegrationsListProps>) {
  const { t } = useTranslation('admin-settings-integrations');
  const { toggleIntegration, togglingIds } = useToggleIntegration();
  const { validateIntegration, validatingIds } = useValidateIntegration();
  const marketplace = useMarketplaceConfig();

  if (integrations.length === 0) {
    const hasMarketplace = marketplace.enabled && !!marketplace.url;

    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileQuestion className="mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">
              {t('integrations.list.noIntegrationsTitle')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {hasMarketplace
                ? t('integrations.list.noIntegrationsMarketplaceMessage')
                : t('integrations.list.noIntegrationsMessage')}
            </p>
            {hasMarketplace && (
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <a
                  href={`${marketplace.url!.replace(/\/$/, '')}/integrations`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Store className="h-4 w-4" />
                  {t('integrations.list.browseMarketplace')}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {[...integrations]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleEnabled={toggleIntegration}
            onValidate={validateIntegration}
            isTogglingEnabled={togglingIds.has(integration.id)}
            isValidating={validatingIds.has(integration.id)}
          />
        ))}
    </div>
  );
}
