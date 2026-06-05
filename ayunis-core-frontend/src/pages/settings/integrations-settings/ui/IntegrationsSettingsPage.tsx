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

export default function IntegrationsSettingsPage() {
  const { t } = useTranslation('settings');
  const { integrations, isLoading, isError, refetch } = useUserIntegrations();
  const [activeIntegration, setActiveIntegration] =
    useState<McpIntegrationResponseDto | null>(null);

  return (
    <SettingsLayout title={t('layout.integrations')}>
      <div className="space-y-4">
        <IntegrationsContent
          isLoading={isLoading}
          isError={isError}
          integrations={integrations}
          onRetry={() => void refetch()}
          onAuthorize={setActiveIntegration}
        />
      </div>

      <UserConfigDialog
        integration={activeIntegration}
        open={!!activeIntegration}
        onOpenChange={(open) => !open && setActiveIntegration(null)}
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
}: Readonly<{
  isLoading: boolean;
  isError: boolean;
  integrations: McpIntegrationResponseDto[];
  onRetry: () => void;
  onAuthorize: (integration: McpIntegrationResponseDto) => void;
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
        />
      ))}
    </div>
  );
}

function IntegrationRow({
  integration,
  onAuthorize,
}: Readonly<{
  integration: McpIntegrationResponseDto;
  onAuthorize: (integration: McpIntegrationResponseDto) => void;
}>) {
  const { t } = useTranslation('settings');
  const status = resolveStatus(integration);

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
        >
          {t(`integrations.action.${status.key}`)}
        </Button>
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
