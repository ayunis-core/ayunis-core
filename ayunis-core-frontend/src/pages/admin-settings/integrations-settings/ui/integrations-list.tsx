import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent } from '@ayunis/ui/components/card';
import { Button } from '@ayunis/ui/components/button';
import { ExternalLink, FileQuestion, Store } from 'lucide-react';
import type { McpIntegration } from '@/pages/admin-settings/integrations-settings/model/types';
import { IntegrationCard } from './integration-card';
import { useToggleIntegration } from '@/pages/admin-settings/integrations-settings/api/useToggleIntegration';
import { useValidateIntegration } from '@/pages/admin-settings/integrations-settings/api/useValidateIntegration';
import { useMarketplaceConfig } from '@/features/marketplace';
import { PaginationWidget } from '@/widgets/pagination';
import { paginateItems } from '@/shared/lib/paginate-items';
import {
  INTEGRATIONS_PAGE_SIZE,
  pageOfIntegration,
  sortIntegrationsByName,
} from '@/pages/admin-settings/integrations-settings/lib/integration-pages';

interface IntegrationsListProps {
  integrations: McpIntegration[];
  page: number;
  integrationId?: string;
  onEdit: (integration: McpIntegration) => void;
  onDelete: (integration: McpIntegration) => void;
}

export function IntegrationsList({
  integrations,
  page,
  integrationId,
  onEdit,
  onDelete,
}: Readonly<IntegrationsListProps>) {
  const { t } = useTranslation('admin-settings-integrations');
  const { toggleIntegration, togglingIds } = useToggleIntegration();
  const { validateIntegration, validatingIds } = useValidateIntegration();
  const marketplace = useMarketplaceConfig();
  const navigate = useNavigate({ from: '/admin-settings/integrations/' });
  const sortedIntegrations = sortIntegrationsByName(integrations);
  // Resolved during render so the saved integration's page is shown on the
  // first paint; the effect below only brings the URL in line.
  const savedIntegrationPage = integrationId
    ? pageOfIntegration(sortedIntegrations, integrationId)
    : undefined;
  const { pageItems, currentPage, totalPages } = paginateItems(
    sortedIntegrations,
    savedIntegrationPage ?? page,
    INTEGRATIONS_PAGE_SIZE,
  );

  useEffect(() => {
    if (savedIntegrationPage) {
      void navigate({ search: { page: savedIntegrationPage }, replace: true });
    } else if (currentPage !== page) {
      void navigate({
        search: (prev) => ({ ...prev, page: currentPage }),
        replace: true,
      });
    }
  }, [savedIntegrationPage, currentPage, page, navigate]);

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
      {pageItems.map((integration) => (
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
      <PaginationWidget
        currentPage={currentPage}
        totalPages={totalPages}
        to="/admin-settings/integrations"
        buildSearchParams={(targetPage) => ({ page: targetPage })}
      />
    </div>
  );
}
