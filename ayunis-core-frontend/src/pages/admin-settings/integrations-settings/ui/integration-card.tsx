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
import { MoreVertical, Loader2, User } from 'lucide-react';
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
  onUserConfig?: (integration: McpIntegration) => void;
  isTogglingEnabled?: boolean;
  isValidating?: boolean;
}

export function IntegrationCard({
  integration,
  onEdit,
  onDelete,
  onToggleEnabled,
  onValidate,
  onUserConfig,
  isTogglingEnabled = false,
  isValidating = false,
}: Readonly<IntegrationCardProps>) {
  const { t } = useTranslation('admin-settings-integrations');
  const isMarketplace = integration.type === 'marketplace';
  const hasUserFields = integration.hasUserFields === true;

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
        </ItemTitle>
        <ItemDescription>
          <IntegrationDescription integration={integration} />
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        {isMarketplace && hasUserFields && onUserConfig && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUserConfig(integration)}
          >
            <User className="h-4 w-4" />
            {t('integrations.card.userConfig')}
          </Button>
        )}
        <Switch
          id={`integration-${integration.id}`}
          checked={integration.enabled}
          onCheckedChange={(checked) => onToggleEnabled(integration, checked)}
          disabled={isTogglingEnabled}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => onValidate(integration)}
          disabled={isValidating}
        >
          {isValidating && <Loader2 className="h-4 w-4 animate-spin" />}
          {isValidating
            ? t('integrations.card.testing')
            : t('integrations.card.testConnection')}
        </Button>
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
              className="text-red-600"
            >
              {t('integrations.card.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ItemActions>
    </Item>
  );
}

function IntegrationDescription({
  integration,
}: {
  integration: McpIntegration;
}) {
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
