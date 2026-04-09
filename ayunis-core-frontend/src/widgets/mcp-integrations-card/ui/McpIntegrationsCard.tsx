import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/shared/ui/shadcn/card';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Switch } from '@/shared/ui/shadcn/switch';
import { Separator } from '@/shared/ui/shadcn/separator';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
import { cn } from '@/shared/lib/shadcn/utils';
import { parseOAuthInfo } from '@/shared/lib/mcp-oauth';
import { OAuthAuthorizeButton, useOAuthStatus } from '@/features/mcp-oauth';
import type { McpIntegrationResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export interface McpIntegrationsHook {
  availableIntegrations: McpIntegrationResponseDto[] | undefined;
  assignedIntegrations: McpIntegrationResponseDto[] | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  handleToggle: (integrationId: string) => Promise<void>;
  isPending: boolean;
}

interface McpIntegrationsCardProps {
  disabled?: boolean;
  translations: {
    title: string;
    description: string;
    failedToLoad: string;
    retryButton: string;
    toggleAriaLabel: (name: string) => string;
    authorizationRequired: string;
    authorize: string;
    authorizing: string;
    reauthorize: string;
    revoke: string;
    oauthErrorToast: string;
    oauthErrorClientNotConfigured: string;
    oauthErrorIntegrationNotFound: string;
    oauthRevokeSuccess: string;
    oauthRevokeError: string;
  };
  hook: McpIntegrationsHook;
}

export default function McpIntegrationsCard({
  disabled = false,
  translations,
  hook,
}: Readonly<McpIntegrationsCardProps>) {
  const {
    availableIntegrations,
    assignedIntegrations,
    isLoading,
    isError,
    refetch,
    handleToggle,
    isPending,
  } = hook;

  const isAssigned = (integrationId: string): boolean => {
    return assignedIntegrations?.some((a) => a.id === integrationId) ?? false;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{translations.title}</CardTitle>
          <CardDescription>{translations.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{translations.title}</CardTitle>
          <CardDescription>{translations.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-sm text-destructive mb-4">
              {translations.failedToLoad}
            </p>
            <button
              onClick={refetch}
              className="text-sm text-primary hover:underline"
            >
              {translations.retryButton}
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!availableIntegrations || availableIntegrations.length === 0) {
    return null;
  }

  const sortedIntegrations = [...availableIntegrations].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{translations.title}</CardTitle>
        <CardDescription>{translations.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedIntegrations.map((integration, index) => {
            const assigned = isAssigned(integration.id);
            const oauthInfo = parseOAuthInfo(integration.oauth);

            return (
              <div key={integration.id}>
                {index > 0 && <Separator className="my-4" />}
                {oauthInfo?.enabled === true && oauthInfo.level === 'user' ? (
                  <OAuthGatedIntegrationRow
                    assigned={assigned}
                    disabled={disabled}
                    index={index}
                    integration={integration}
                    isPending={isPending}
                    onToggle={handleToggle}
                    total={sortedIntegrations.length}
                    translations={translations}
                  />
                ) : (
                  <StandardIntegrationRow
                    assigned={assigned}
                    disabled={disabled}
                    index={index}
                    integration={integration}
                    isPending={isPending}
                    onToggle={handleToggle}
                    total={sortedIntegrations.length}
                    translations={translations}
                  />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function StandardIntegrationRow({
  assigned,
  disabled,
  index,
  integration,
  isPending,
  onToggle,
  total,
  translations,
}: Readonly<{
  assigned: boolean;
  disabled: boolean;
  index: number;
  integration: McpIntegrationResponseDto;
  isPending: boolean;
  onToggle: (integrationId: string) => Promise<void>;
  total: number;
  translations: McpIntegrationsCardProps['translations'];
}>) {
  return (
    <Item
      className={cn(
        index === 0 && 'pt-0',
        index === total - 1 && 'pb-0',
        'px-0',
      )}
    >
      <ItemContent>
        <ItemTitle>{integration.name}</ItemTitle>
        {integration.description && (
          <ItemDescription>{integration.description}</ItemDescription>
        )}
      </ItemContent>
      <ItemActions>
        <Switch
          checked={assigned}
          onCheckedChange={() => void onToggle(integration.id)}
          disabled={disabled || isPending}
          aria-label={translations.toggleAriaLabel(integration.name)}
        />
      </ItemActions>
    </Item>
  );
}

function OAuthGatedIntegrationRow({
  assigned,
  disabled,
  index,
  integration,
  isPending,
  onToggle,
  total,
  translations,
}: Readonly<{
  assigned: boolean;
  disabled: boolean;
  index: number;
  integration: McpIntegrationResponseDto;
  isPending: boolean;
  onToggle: (integrationId: string) => Promise<void>;
  total: number;
  translations: McpIntegrationsCardProps['translations'];
}>) {
  const oauthInfo = parseOAuthInfo(integration.oauth);
  const { oauthStatus } = useOAuthStatus(integration.id);
  const isAuthorized =
    oauthStatus?.authorized ?? oauthInfo?.authorized ?? false;
  const requiresUserAuth =
    oauthInfo?.enabled === true && oauthInfo.level === 'user' && !isAuthorized;

  return (
    <Item
      className={cn(
        index === 0 && 'pt-0',
        index === total - 1 && 'pb-0',
        'px-0',
      )}
    >
      <ItemContent>
        <ItemTitle>
          {integration.name}
          {requiresUserAuth && (
            <Badge className="bg-amber-500 text-white hover:bg-amber-600">
              {translations.authorizationRequired}
            </Badge>
          )}
        </ItemTitle>
        {integration.description && (
          <ItemDescription>{integration.description}</ItemDescription>
        )}
      </ItemContent>
      <ItemActions className="flex-wrap justify-end">
        {requiresUserAuth && (
          <OAuthAuthorizeButton
            integrationId={integration.id}
            isAuthorized={false}
            messages={{
              authorize: translations.authorize,
              authorizing: translations.authorizing,
              reauthorize: translations.reauthorize,
              revoke: translations.revoke,
              errorToast: translations.oauthErrorToast,
              errorClientNotConfigured:
                translations.oauthErrorClientNotConfigured,
              errorIntegrationNotFound:
                translations.oauthErrorIntegrationNotFound,
              revokeSuccess: translations.oauthRevokeSuccess,
              revokeError: translations.oauthRevokeError,
            }}
          />
        )}
        <Switch
          checked={assigned}
          onCheckedChange={() => void onToggle(integration.id)}
          disabled={(requiresUserAuth && !assigned) || disabled || isPending}
          aria-label={translations.toggleAriaLabel(integration.name)}
        />
      </ItemActions>
    </Item>
  );
}
