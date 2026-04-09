import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ExternalLink } from 'lucide-react';
import {
  getAppControllerIsCloudQueryKey,
  useAppControllerIsCloud,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { McpIntegrationResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { UserConfigDialog } from '@/features/mcp-user-config';
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
import { showError, showSuccess } from '@/shared/lib/toast';
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

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const oauthStatus = searchParams.get('oauth');
    if (!oauthStatus) {
      return;
    }

    if (oauthStatus === 'success') {
      showSuccess(t('oauth.successToast'));
    } else if (oauthStatus === 'error') {
      const reason = searchParams.get('reason');
      showError(getOAuthErrorMessage(t, reason));
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
            const oauthInfo = parseOAuthInfo(integration.oauth);
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
                      <Badge
                        className={
                          oauthInfo.authorized
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-amber-500 text-white hover:bg-amber-600'
                        }
                      >
                        {oauthInfo.authorized
                          ? t('row.statusAuthorized')
                          : t('row.statusPending')}
                      </Badge>
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

function getUserFields(
  integration: Pick<McpIntegrationResponseDto, 'configSchema'>,
): unknown[] {
  if (
    !integration.configSchema ||
    typeof integration.configSchema !== 'object'
  ) {
    return [];
  }

  const schema = integration.configSchema as { userFields?: unknown[] };
  return Array.isArray(schema.userFields) ? schema.userFields : [];
}

function hasUserLevelOAuth(
  integration: Pick<McpIntegrationResponseDto, 'oauth'>,
): boolean {
  const oauthInfo = parseOAuthInfo(integration.oauth);
  return oauthInfo?.enabled === true && oauthInfo.level === 'user';
}

function parseOAuthInfo(value: unknown) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const oauth = value as Record<string, unknown>;
  if (oauth.enabled !== true && oauth.enabled !== false) {
    return null;
  }
  if (oauth.level !== null && oauth.level !== 'org' && oauth.level !== 'user') {
    return null;
  }
  if (oauth.authorized !== true && oauth.authorized !== false) {
    return null;
  }

  return {
    enabled: oauth.enabled,
    level: oauth.level,
    authorized: oauth.authorized,
  };
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

function getOAuthErrorMessage(
  t: (key: string) => string,
  reason: string | null,
): string {
  if (!reason) {
    return t('oauth.errorToast');
  }

  const normalizedReason = reason.toLowerCase();
  if (normalizedReason.includes('state')) {
    return t('oauth.errorState');
  }
  if (normalizedReason.includes('exchange')) {
    return t('oauth.errorOauthExchange');
  }
  if (normalizedReason.includes('client credentials')) {
    return t('oauth.errorClientNotConfigured');
  }

  return t('oauth.errorToast');
}
