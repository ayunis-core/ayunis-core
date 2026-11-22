import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { McpIntegration } from '@/pages/admin-settings/integrations-settings/model/types';
import { IntegrationCard } from './integration-card';
import { IntegrationsEmptyState } from './integrations-empty-state';
import { useToggleIntegration } from '@/pages/admin-settings/integrations-settings/api/useToggleIntegration';
import { useValidateIntegration } from '@/pages/admin-settings/integrations-settings/api/useValidateIntegration';
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
  const { toggleIntegration, togglingIds } = useToggleIntegration();
  const { validateIntegration, validatingIds } = useValidateIntegration();
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
    return <IntegrationsEmptyState />;
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
