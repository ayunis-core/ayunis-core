import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import { Plus, AlertCircle, ExternalLink } from 'lucide-react';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { IntegrationsList } from './integrations-list';
import { CreatePredefinedDialog } from './create-predefined-dialog';
import { CreateCustomDialog } from './create-custom-dialog';
import { EditIntegrationDialog } from './edit-integration-dialog';
import { DeleteConfirmationDialog } from './delete-confirmation-dialog';
import SettingsLayout from '../../admin-settings-layout';
import { useMcpIntegrationsQueries } from '../api/useMcpIntegrationsQueries';
import type { McpIntegration } from '../model/types';
import { UserConfigDialog } from '@/features/mcp-user-config';
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
import { CreateSelfDefinedDialog } from './create-self-defined-dialog';
import { showError, showSuccess } from '@/shared/lib/toast';
import { getOAuthErrorMessage } from '@/shared/lib/mcp-oauth';

export function McpIntegrationsPage({
  isCloud,
}: Readonly<{ isCloud: boolean }>) {
  const { t } = useTranslation('admin-settings-integrations');
  const { t: tLayout } = useTranslation('admin-settings-layout');

  // Dialog states
  const [createPredefinedOpen, setCreatePredefinedOpen] = useState(false);
  const [createCustomOpen, setCreateCustomOpen] = useState(false);
  const [createSelfDefinedOpen, setCreateSelfDefinedOpen] = useState(false);
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

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const oauthStatus = searchParams.get('oauth');
    if (!oauthStatus) {
      return;
    }

    if (oauthStatus === 'success') {
      showSuccess(t('integrations.oauth.successToast'));
    } else if (oauthStatus === 'error') {
      const reason = searchParams.get('reason');
      showError(getOAuthErrorMessage(t, reason, 'integrations.oauth.'));
    }

    searchParams.delete('oauth');
    searchParams.delete('id');
    searchParams.delete('reason');

    const cleanedSearch = searchParams.toString();
    const searchSuffix = cleanedSearch ? `?${cleanedSearch}` : '';
    const cleanedUrl =
      window.location.pathname + searchSuffix + window.location.hash;
    window.history.replaceState({}, '', cleanedUrl);
  }, [t]);

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
        <HeaderActions
          isCloud={isCloud}
          onCreatePredefined={handleOpenCreatePredefined}
          onCreateCustom={() => setCreateCustomOpen(true)}
          onCreateSelfDefined={() => setCreateSelfDefinedOpen(true)}
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

        <CreateSelfDefinedDialog
          open={createSelfDefinedOpen}
          onOpenChange={setCreateSelfDefinedOpen}
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
          messages={{
            title: (name: string) =>
              t('integrations.userConfig.title', { name }),
            description: t('integrations.userConfig.description'),
            save: t('integrations.userConfig.save'),
            saving: t('integrations.userConfig.saving'),
            cancel: t('integrations.userConfig.cancel'),
            close: t('integrations.userConfig.close'),
            success: t('integrations.userConfig.success'),
            error: t('integrations.userConfig.error'),
            notFound: t('integrations.userConfig.notFound'),
            nothingToConfigure: t('integrations.userConfig.nothingToConfigure'),
            authorizationTitle: t('integrations.userConfig.authorizationTitle'),
            authorizationDescription: t(
              'integrations.userConfig.authorizationDescription',
            ),
            statusAuthorized: t('integrations.oauth.statusAuthorized'),
            statusPending: t('integrations.oauth.statusPending'),
            statusExpiresAt: (date: string) =>
              t('integrations.oauth.statusExpiresAt', { date }),
            oauthButton: {
              authorize: t('integrations.oauth.authorize'),
              authorizing: t('integrations.oauth.authorizing'),
              reauthorize: t('integrations.oauth.reauthorize'),
              revoke: t('integrations.oauth.revoke'),
              errorToast: t('integrations.oauth.errorToast'),
              errorClientNotConfigured: t(
                'integrations.oauth.errorClientNotConfigured',
              ),
              errorIntegrationNotFound: t(
                'integrations.oauth.errorIntegrationNotFound',
              ),
              revokeSuccess: t('integrations.oauth.revokeSuccess'),
              revokeError: t('integrations.oauth.revokeError'),
            },
          }}
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
  onCreateSelfDefined,
  t,
}: Readonly<{
  isCloud: boolean;
  onCreatePredefined: () => void;
  onCreateCustom: () => void;
  onCreateSelfDefined: () => void;
  t: (key: string) => string;
}>) {
  return (
    <div className="flex gap-2">
      <HelpLink path="settings/admin/integrations/" />
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
            <DropdownMenuItem onClick={onCreateCustom}>
              {t('integrations.page.addCustom')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateSelfDefined}>
              {t('integrations.page.addSelfDefined')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
