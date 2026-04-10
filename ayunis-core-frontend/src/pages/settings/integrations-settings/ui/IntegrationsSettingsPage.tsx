import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ExternalLink } from 'lucide-react';
import {
  getAppControllerIsCloudQueryKey,
  useAppControllerIsCloud,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { McpIntegrationResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { UserConfigDialog } from '@/features/mcp-user-config';
import { OAuthStatusBadge } from '@/features/mcp-oauth';
import { EmptyState } from '@/widgets/empty-state';
import TooltipIf from '@/widgets/tooltip-if/ui/TooltipIf';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import { parseMcpOAuthInfo, hasUserLevelOAuth } from '@/shared/lib/mcp-oauth';
import { getUserFields } from '@/shared/lib/mcp-config-schema';
import { useHandleMcpOAuthCallback } from '@/widgets/mcp-integrations-card';
import { SettingsLayout } from '../../settings-layout';
import { useAvailableIntegrations } from '../api/useAvailableIntegrations';

export default function IntegrationsSettingsPage() {
  const { t } = useTranslation('settings-integrations');
  const [selectedIntegration, setSelectedIntegration] =
    useState<McpIntegrationResponseDto | null>(null);
  const { availableIntegrations, isLoading, error, refetch } =
    useAvailableIntegrations();
  const { data: cloudData } = useAppControllerIsCloud({
    query: {
      queryKey: getAppControllerIsCloudQueryKey(),
      staleTime: 300000,
    },
  });

  useHandleMcpOAuthCallback(t, refetch, 'oauth');

  if (isLoading) {
    return (
      <SettingsLayout title={t('page.title')}>
        <div className="space-y-4">
          {[1, 2, 3].map((index) => (
            <div
              key={index}
              className="rounded-lg border border-border p-4 space-y-3"
            >
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-28" />
            </div>
          ))}
        </div>
      </SettingsLayout>
    );
  }

  if (error) {
    return (
      <SettingsLayout title={t('page.title')}>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-600" />
            <h2 className="mb-2 text-2xl font-bold">
              {t('page.errorLoadingTitle')}
            </h2>
            <p className="mb-4 text-muted-foreground">
              {(error as { message?: string }).message ??
                t('page.errorLoadingMessage')}
            </p>
            <Button onClick={() => void refetch()}>{t('page.retry')}</Button>
          </div>
        </div>
      </SettingsLayout>
    );
  }

  if (availableIntegrations.length === 0) {
    return (
      <SettingsLayout title={t('page.title')}>
        <EmptyState
          title={t('page.title')}
          description={t('page.emptyState')}
          action={
            cloudData?.isCloud ? undefined : (
              <Button variant="outline" asChild>
                <a
                  href="https://marketplace.ayunis.de/integrations"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('page.emptyStateLink')}
                </a>
              </Button>
            )
          }
        />
      </SettingsLayout>
    );
  }

  const sortedIntegrations = [...availableIntegrations].sort((left, right) =>
    left.name.localeCompare(right.name),
  );

  return (
    <SettingsLayout title={t('page.title')}>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{t('page.description')}</p>
        <div className="space-y-4">
          {sortedIntegrations.map((integration) => {
            const configurable = hasConfigurableOptions(integration);
            const oauthInfo = parseMcpOAuthInfo(integration.oauth);
            const isUserOAuth =
              oauthInfo?.enabled === true && oauthInfo.level === 'user';

            return (
              <Item key={integration.id} variant="outline">
                <ItemContent>
                  <ItemTitle>{integration.name}</ItemTitle>
                  <ItemDescription>
                    {integration.description ?? ''}
                  </ItemDescription>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Badge variant="outline">
                      {getConnectionStatusLabel(
                        t,
                        integration.connectionStatus,
                      )}
                    </Badge>
                    {isUserOAuth && (
                      <OAuthStatusBadge
                        status={oauthInfo.authorized ? 'authorized' : 'pending'}
                        authorizedLabel={t('row.statusAuthorized')}
                        pendingLabel={t('row.statusPending')}
                      />
                    )}
                  </div>
                  {!configurable && (
                    <p className="pt-2 text-xs text-muted-foreground">
                      {t('row.noConfigurable')}
                    </p>
                  )}
                </ItemContent>
                <ItemActions className="self-start">
                  <TooltipIf
                    condition={!configurable}
                    tooltip={t('row.noConfigurable')}
                  >
                    <Button
                      onClick={() => setSelectedIntegration(integration)}
                      disabled={!configurable}
                    >
                      {t('row.configureButton')}
                    </Button>
                  </TooltipIf>
                </ItemActions>
              </Item>
            );
          })}
        </div>
      </div>

      <UserConfigDialog
        integration={selectedIntegration}
        open={selectedIntegration !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedIntegration(null);
          }
        }}
        messages={{
          title: (name: string) => t('dialog.title', { name }),
          description: t('dialog.description'),
          save: t('dialog.save'),
          saving: t('dialog.saving'),
          cancel: t('dialog.cancel'),
          close: t('dialog.close'),
          success: t('dialog.success'),
          error: t('dialog.error'),
          notFound: t('dialog.notFound'),
          nothingToConfigure: t('dialog.nothingToConfigure'),
          authorizationTitle: t('dialog.authorizationTitle'),
          authorizationDescription: t('dialog.authorizationDescription'),
          statusAuthorized: t('row.statusAuthorized'),
          statusPending: t('row.statusPending'),
          statusExpiresAt: (date: string) =>
            t('oauth.statusExpiresAt', { date }),
          oauthButton: {
            authorize: t('oauth.authorize'),
            authorizing: t('oauth.authorizing'),
            reauthorize: t('oauth.reauthorize'),
            revoke: t('oauth.revoke'),
            errorToast: t('oauth.errorToast'),
            errorClientNotConfigured: t('oauth.errorClientNotConfigured'),
            errorIntegrationNotFound: t('oauth.errorIntegrationNotFound'),
            revokeSuccess: t('oauth.revokeSuccess'),
            revokeError: t('oauth.revokeError'),
          },
        }}
      />
    </SettingsLayout>
  );
}

function hasConfigurableOptions(
  integration: McpIntegrationResponseDto,
): boolean {
  return (
    integration.hasUserFields === true ||
    getUserFields(integration).length > 0 ||
    hasUserLevelOAuth(integration)
  );
}

function getConnectionStatusLabel(
  t: (key: string) => string,
  connectionStatus?: McpIntegrationResponseDto['connectionStatus'],
): string {
  switch (connectionStatus ?? 'unknown') {
    case 'connected':
      return t('row.connectionConnected');
    case 'disconnected':
      return t('row.connectionDisconnected');
    case 'error':
      return t('row.connectionError');
    case 'pending_auth':
      return t('row.connectionPendingAuth');
    case 'unknown':
      return t('row.connectionUnknown');
  }
}
