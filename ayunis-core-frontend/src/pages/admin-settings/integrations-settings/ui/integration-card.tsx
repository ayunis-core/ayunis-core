import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';
import { Switch } from '@/shared/ui/shadcn/switch';
import { Badge } from '@/shared/ui/shadcn/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import { MoreVertical, Loader2 } from 'lucide-react';
import type { McpIntegration } from '../model/types';
import { getIntegrationTypeLabel } from '../lib/helpers';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/shared/ui/shadcn/item';

interface IntegrationCardProps {
  integration: McpIntegration;
  onEdit: (integration: McpIntegration) => void;
  onDelete: (integration: McpIntegration) => void;
  onToggleEnabled: (integration: McpIntegration, enabled: boolean) => void;
  onValidate: (integration: McpIntegration) => void;
  isTogglingEnabled?: boolean;
  isValidating?: boolean;
}

export function IntegrationCard({
  integration,
  onEdit,
  onDelete,
  onToggleEnabled,
  onValidate,
  isTogglingEnabled = false,
  isValidating = false,
}: Readonly<IntegrationCardProps>) {
  const { t } = useTranslation('admin-settings-integrations');
  const isMarketplace = integration.type === 'marketplace';
  // Marketplace integrations that need each user to supply their own
  // credentials can't be validated by the org-level test — see
  // TestConnectionButton.
  const requiresUserConfig =
    isMarketplace && integration.userAuthorizationRequired === true;

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>
          {integration.name}
          {isMarketplace && (
            <Badge variant="secondary" className="ml-2">
              {t('integrations.card.marketplace')}
            </Badge>
          )}
          {requiresUserConfig && (
            <Badge variant="outline" className="ml-2">
              {t('integrations.card.userConfigNeeded')}
            </Badge>
          )}
        </ItemTitle>
        <ItemDescription>
          <IntegrationDescription integration={integration} />
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Switch
          id={`integration-${integration.id}`}
          checked={integration.enabled}
          onCheckedChange={(checked) => onToggleEnabled(integration, checked)}
          disabled={isTogglingEnabled}
        />
        <TestConnectionButton
          integration={integration}
          onValidate={onValidate}
          isValidating={isValidating}
          requiresUserConfig={requiresUserConfig}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">{t('integrations.card.openMenu')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(integration)}>
              {t('integrations.card.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(integration)}
              variant="destructive"
            >
              {t('integrations.card.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ItemActions>
    </Item>
  );
}

function TestConnectionButton({
  integration,
  onValidate,
  isValidating,
  requiresUserConfig,
}: Readonly<{
  integration: McpIntegration;
  onValidate: (integration: McpIntegration) => void;
  isValidating: boolean;
  requiresUserConfig: boolean;
}>) {
  const { t } = useTranslation('admin-settings-integrations');

  const button = (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onValidate(integration)}
      disabled={isValidating || requiresUserConfig}
    >
      {isValidating && <Loader2 className="h-4 w-4 animate-spin" />}
      {isValidating
        ? t('integrations.card.testing')
        : t('integrations.card.testConnection')}
    </Button>
  );

  if (!requiresUserConfig) {
    return button;
  }

  // The disabled button suppresses pointer events, so wrap it in a focusable
  // span that owns the tooltip trigger.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>{button}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {t('integrations.card.testConnectionUserConfigTooltip')}
      </TooltipContent>
    </Tooltip>
  );
}

function IntegrationDescription({
  integration,
}: Readonly<{
  integration: McpIntegration;
}>) {
  if (integration.type === 'marketplace') {
    return <>{integration.marketplaceIdentifier ?? ''}</>;
  }

  if (integration.type === 'predefined') {
    return <></>;
  }

  const typeLabel = getIntegrationTypeLabel(integration.type);
  return (
    <>
      {typeLabel} - {integration.serverUrl}
    </>
  );
}
