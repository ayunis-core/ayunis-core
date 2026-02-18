import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import { Plus, AlertCircle, ExternalLink } from 'lucide-react';
import { IntegrationsList } from './integrations-list';
import { CreatePredefinedDialog } from './create-predefined-dialog';
import { CreateCustomDialog } from './create-custom-dialog';
import { EditIntegrationDialog } from './edit-integration-dialog';
import { DeleteConfirmationDialog } from './delete-confirmation-dialog';
import { UserConfigDialog } from './user-config-dialog';
import SettingsLayout from '../../admin-settings-layout';
import { useMcpIntegrationsQueries } from '../api/useMcpIntegrationsQueries';
import type { McpIntegration } from '../model/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
import { ComingSoonDialog } from './coming-soon-dialog';

export function McpIntegrationsPage({ isCloud }: { isCloud: boolean }) {
  const { t } = useTranslation('admin-settings-integrations');
  const { t: tLayout } = useTranslation('admin-settings-layout');

  // Dialog states
  const [createPredefinedOpen, setCreatePredefinedOpen] = useState(false);
  const [createCustomOpen, setCreateCustomOpen] = useState(false);
  const [editIntegration, setEditIntegration] = useState<McpIntegration | null>(
    null,
  );
  const [deleteIntegration, setDeleteIntegration] =
    useState<McpIntegration | null>(null);
  const [userConfigIntegration, setUserConfigIntegration] =
    useState<McpIntegration | null>(null);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);

  // Queries
  const {
    integrations,
    isLoadingIntegrations,
    integrationsError,
    refetchIntegrations,
    predefinedConfigs,
  } = useMcpIntegrationsQueries();

  const handleOpenCreatePredefined = () => {
    if (!predefinedConfigs.length) {
      setComingSoonOpen(true);
      return;
    }

    setCreatePredefinedOpen(true);
  };

  // Loading state
  if (isLoadingIntegrations) {
    return (
      <SettingsLayout title={tLayout('layout.integrations')}>
        <div className="space-y-4">
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
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-600" />
            <h2 className="mb-2 text-2xl font-bold">
              {t('integrations.page.errorLoadingTitle')}
            </h2>
            <p className="mb-4 text-muted-foreground">
              {(integrationsError as { message?: string })?.message ||
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
        <HeaderActions
          isCloud={isCloud}
          onCreatePredefined={handleOpenCreatePredefined}
          onCreateCustom={() => setCreateCustomOpen(true)}
          t={t}
        />
      }
      title={tLayout('layout.integrations')}
    >
      <div className="space-y-4">
        <IntegrationsList
          integrations={integrations}
          onEdit={setEditIntegration}
          onDelete={setDeleteIntegration}
          onUserConfig={setUserConfigIntegration}
        />

        <CreatePredefinedDialog
          open={createPredefinedOpen}
          onOpenChange={setCreatePredefinedOpen}
          predefinedConfigs={predefinedConfigs}
          isCloud={isCloud}
        />

        <CreateCustomDialog
          open={createCustomOpen}
          onOpenChange={setCreateCustomOpen}
        />

        <EditIntegrationDialog
          integration={editIntegration}
          open={!!editIntegration}
          onOpenChange={(open) => !open && setEditIntegration(null)}
        />

        <DeleteConfirmationDialog
          integration={deleteIntegration}
          open={!!deleteIntegration}
          onOpenChange={(open) => !open && setDeleteIntegration(null)}
        />

        <UserConfigDialog
          integration={userConfigIntegration}
          open={!!userConfigIntegration}
          onOpenChange={(open) => !open && setUserConfigIntegration(null)}
        />

        <ComingSoonDialog
          open={comingSoonOpen}
          onOpenChange={setComingSoonOpen}
        />
      </div>
    </SettingsLayout>
  );
}

function HeaderActions({
  isCloud,
  onCreatePredefined,
  onCreateCustom,
  t,
}: {
  isCloud: boolean;
  onCreatePredefined: () => void;
  onCreateCustom: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" asChild>
        <a
          href="https://marketplace.ayunis.de/integrations"
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink className="h-4 w-4" />
          {t('integrations.page.browseMarketplace')}
        </a>
      </Button>
      {isCloud ? (
        <Button variant="default" size="sm" onClick={onCreatePredefined}>
          <Plus className="h-4 w-4" />
          {t('integrations.page.add')}
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              {t('integrations.page.add')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onCreatePredefined}>
              {t('integrations.page.addPredefined')}
            </DropdownMenuItem>
            {!isCloud && (
              <DropdownMenuItem onClick={onCreateCustom}>
                {t('integrations.page.addCustom')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
