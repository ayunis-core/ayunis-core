import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';
import { Loader2, Plug } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import TooltipIf from '@/widgets/tooltip-if/ui/TooltipIf';
import type { IntegrationSummary } from '@/shared/contexts/chat/chatContext';
import { useAvailableIntegrations } from '../api/useAvailableIntegrations';

interface IntegrationsSubmenuProps {
  onIntegrationSelect: (integration: IntegrationSummary) => void;
  attachedIntegrationIds: string[];
}

export function IntegrationsSubmenu({
  onIntegrationSelect,
  attachedIntegrationIds,
}: Readonly<IntegrationsSubmenuProps>) {
  const { t } = useTranslation('common');
  const { integrations, isLoading, error } = useAvailableIntegrations();

  // Filter out already-attached integrations
  const availableIntegrations = integrations.filter(
    (integration) => !attachedIntegrationIds.includes(integration.id),
  );

  return (
    <DropdownMenuGroup>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Plug className="h-4 w-4" />
          {t('chatInput.addIntegration')}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {isLoading && (
            <DropdownMenuItem disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('common.loading')}
            </DropdownMenuItem>
          )}
          {!isLoading && !!error && (
            <DropdownMenuItem disabled className="text-destructive">
              {t('chatInput.integrationsLoadError')}
            </DropdownMenuItem>
          )}
          {!isLoading && !error && availableIntegrations.length === 0 && (
            <DropdownMenuItem disabled>
              {t(
                integrations.length === 0
                  ? 'chatInput.integrationsEmptyState'
                  : 'chatInput.integrationsAllAttached',
              )}
            </DropdownMenuItem>
          )}
          {!isLoading && !error
            ? availableIntegrations.map((integration) => {
                const isUnauthorized = integration.userAuthorized === false;
                return (
                  <TooltipIf
                    key={integration.id}
                    condition={isUnauthorized}
                    tooltip={t('chatInput.integrationNotAuthorized')}
                  >
                    <DropdownMenuItem
                      disabled={isUnauthorized}
                      onClick={() =>
                        onIntegrationSelect({
                          id: integration.id,
                          name: integration.name,
                          logoUrl: integration.logoUrl,
                        })
                      }
                    >
                      {integration.name}
                    </DropdownMenuItem>
                  </TooltipIf>
                );
              })
            : null}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </DropdownMenuGroup>
  );
}
