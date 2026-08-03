import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Plug } from 'lucide-react';
import { SettingsLayout } from '../../settings-layout';
import { Button } from '@/shared/ui/shadcn/button';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
import { UserConfigDialog } from '@/widgets/mcp-user-config';
import type { McpIntegrationResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useUserIntegrations } from '../api/useUserIntegrations';
import {
  useAuthorizeMcpOAuth,
  useDisconnectMcpOAuth,
} from '../api/useMcpOAuth';
import {
  canDisconnectOAuth,
  resolveIntegrationOAuthAction,
} from '../lib/resolve-integration-oauth-action';

export default function IntegrationsSettingsPage() {
  const { t } = useTranslation('settings');
  const { integrations, isLoading, isError, refetch } = useUserIntegrations();
  const [activeIntegration, setActiveIntegration] =
    useState<McpIntegrationResponseDto | null>(null);
  const authorizeOAuth = useAuthorizeMcpOAuth();
  const disconnectOAuth = useDisconnectMcpOAuth();

  const connect = (integration: McpIntegrationResponseDto) => {
    const action = resolveIntegrationOAuthAction(integration);
    if (action === 'configure' || action === 'configureThenConnect') {
      setActiveIntegration(integration);
      return;
    }
    authorizeOAuth.mutate(integration.id);
  };

  const continueAfterUserConfig = () => {
    if (
      activeIntegration &&
      resolveIntegrationOAuthAction(activeIntegration) ===
        'configureThenConnect'
    ) {
      authorizeOAuth.mutate(activeIntegration.id);
    }
  };

  return (
    <SettingsLayout title={t('layout.integrations')}>
      <div className="space-y-4">
        <IntegrationsContent
          isLoading={isLoading}
          isError={isError}
          integrations={integrations}
          onRetry={() => void refetch()}
          onAuthorize={connect}
          onDisconnect={(integration) => disconnectOAuth.mutate(integration.id)}
          isOAuthPending={authorizeOAuth.isPending || disconnectOAuth.isPending}
        />
      </div>

      <UserConfigDialog
        integration={activeIntegration}
        open={!!activeIntegration}
        onOpenChange={(open) => !open && setActiveIntegration(null)}
        onSaved={continueAfterUserConfig}
      />
    </SettingsLayout>
  );
}

function IntegrationsContent({
  isLoading,
  isError,
  integrations,
  onRetry,
  onAuthorize,
  onDisconnect,
  isOAuthPending,
}: Readonly<{
  isLoading: boolean;
  isError: boolean;
  integrations: McpIntegrationResponseDto[];
  onRetry: () => void;
  onAuthorize: (integration: McpIntegrationResponseDto) => void;
  onDisconnect: (integration: McpIntegrationResponseDto) => void;
  isOAuthPending: boolean;
}>) {
  const { t } = useTranslation('settings');

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-muted-foreground">
          {t('integrations.failedToLoad')}
        </p>
        <Button onClick={onRetry}>{t('integrations.retry')}</Button>
      </div>
    );
  }

  if (integrations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Plug className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">{t('integrations.empty')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {integrations.map((integration) => (
        <IntegrationRow
          key={integration.id}
          integration={integration}
          onAuthorize={onAuthorize}
          onDisconnect={onDisconnect}
          isOAuthPending={isOAuthPending}
        />
      ))}
    </div>
  );
}

function IntegrationRow({
  integration,
  onAuthorize,
  onDisconnect,
  isOAuthPending,
}: Readonly<{
  integration: McpIntegrationResponseDto;
  onAuthorize: (integration: McpIntegrationResponseDto) => void;
  onDisconnect: (integration: McpIntegrationResponseDto) => void;
  isOAuthPending: boolean;
}>) {
  const { t } = useTranslation('settings');
  const status = resolveStatus(integration);
  const oauthAction = resolveIntegrationOAuthAction(integration);
  const usesOAuth = oauthAction !== 'configure';
  const oauthActionKey =
    oauthAction === 'reconnect'
      ? 'integrations.oauth.reconnect'
      : 'integrations.oauth.connect';
  const actionLabel = usesOAuth
    ? t(oauthActionKey)
    : t(`integrations.action.${status.key}`);

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>{integration.name}</ItemTitle>
        {integration.description && (
          <ItemDescription>{integration.description}</ItemDescription>
        )}
      </ItemContent>
      <ItemActions>
        <Badge variant={status.badgeVariant}>
          {t(`integrations.status.${status.key}`)}
        </Badge>
        <Button
          variant={status.key === 'actionRequired' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onAuthorize(integration)}
          disabled={isOAuthPending}
        >
          {actionLabel}
        </Button>
        {canDisconnectOAuth(integration) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDisconnect(integration)}
            disabled={isOAuthPending}
          >
            {t('integrations.oauth.disconnect')}
          </Button>
        )}
      </ItemActions>
    </Item>
  );
}

type IntegrationStatusKey = 'actionRequired' | 'connected' | 'optional';

function resolveStatus(integration: McpIntegrationResponseDto): {
  key: IntegrationStatusKey;
  badgeVariant: 'default' | 'destructive' | 'secondary';
} {
  if (integration.userAuthorizationRequired !== true) {
    return { key: 'optional', badgeVariant: 'secondary' };
  }
  if (integration.userAuthorized === true) {
    return { key: 'connected', badgeVariant: 'default' };
  }
  return { key: 'actionRequired', badgeVariant: 'destructive' };
}
