import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import { Skeleton } from '@ayunis/ui/components/skeleton';
import { AlertCircle } from 'lucide-react';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { IntegrationsList } from './integrations-list';
import { EditIntegrationDialog } from './edit-integration-dialog';
import { DeleteConfirmationDialog } from './delete-confirmation-dialog';
import SettingsLayout from '@/pages/admin-settings/admin-settings-layout';
import { useMcpIntegrationsQueries } from '@/pages/admin-settings/integrations-settings/api/useMcpIntegrationsQueries';
import type { McpIntegration } from '@/pages/admin-settings/integrations-settings/model/types';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { useIsFeatureEnabled } from '@/features/feature-toggles';
import { ConnectionsSection } from './connections-section';
import { AddIntegrationMenu } from './add-integration-menu';

export function McpIntegrationsPage({
  page,
  integrationId,
}: Readonly<{ page: number; integrationId?: string }>) {
  const { t } = useTranslation('admin-settings-integrations');
  const { t: tLayout } = useTranslation('admin-settings-layout');

  // Dialog states
  const [editIntegration, setEditIntegration] = useState<McpIntegration | null>(
    null,
  );
  const [deleteIntegration, setDeleteIntegration] =
    useState<McpIntegration | null>(null);
  const isConnectorsEnabled = useIsFeatureEnabled('connectorsEnabled');
  const navigate = useNavigate({ from: '/admin-settings/integrations/' });

  // Queries
  const {
    integrations,
    isLoadingIntegrations,
    integrationsError,
    refetchIntegrations,
  } = useMcpIntegrationsQueries();

  // Connections sit apart from the MCP integrations and show whatever their
  // state.
  const sectionsAboveMcp = (
    <>
      <ConnectionsSection connectorsEnabled={isConnectorsEnabled} />
      <h2 className="pt-2 text-lg font-semibold">
        {t('integrations.page.mcpTitle')}
      </h2>
    </>
  );

  const showSavedIntegration = (saved: McpIntegration) => {
    void navigate({ search: { integration: saved.id } });
  };

  // Loading state
  if (isLoadingIntegrations) {
    return (
      <SettingsLayout title={tLayout('layout.integrations')}>
        <div className="space-y-4">
          {sectionsAboveMcp}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Item key={i}>
                <ItemContent>
                  <ItemTitle>
                    <Skeleton className="h-4 w-24" />
                  </ItemTitle>
                </ItemContent>
                <ItemActions>
                  <Skeleton className="h-4 w-4" />
                </ItemActions>
              </Item>
            ))}
          </div>
        </div>
      </SettingsLayout>
    );
  }

  // Error state
  if (integrationsError) {
    return (
      <SettingsLayout title={tLayout('layout.integrations')}>
        <div className="space-y-4">{sectionsAboveMcp}</div>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-600" />
            <h2 className="mb-2 text-2xl font-bold">
              {t('integrations.page.errorLoadingTitle')}
            </h2>
            <p className="mb-4 text-muted-foreground">
              {(integrationsError as { message?: string }).message ??
                t('integrations.page.errorLoadingMessage')}
            </p>
            <Button onClick={() => void refetchIntegrations()}>
              {t('integrations.page.retry')}
            </Button>
          </div>
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout
      action={
        <div className="flex gap-2">
          <HelpLink path="settings/admin/integrations/" />
          <AddIntegrationMenu showIcon />
        </div>
      }
      title={tLayout('layout.integrations')}
    >
      <div className="space-y-4">
        {sectionsAboveMcp}
        <IntegrationsList
          integrations={integrations}
          page={page}
          integrationId={integrationId}
          onEdit={setEditIntegration}
          onDelete={setDeleteIntegration}
        />

        <EditIntegrationDialog
          integration={editIntegration}
          open={!!editIntegration}
          onOpenChange={(open) => !open && setEditIntegration(null)}
          onSaved={showSavedIntegration}
        />

        <DeleteConfirmationDialog
          integration={deleteIntegration}
          open={!!deleteIntegration}
          onOpenChange={(open) => !open && setDeleteIntegration(null)}
        />
      </div>
    </SettingsLayout>
  );
}
