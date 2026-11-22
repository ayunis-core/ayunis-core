import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Plus, Server, Store } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { useMarketplaceConfig } from '@/features/marketplace';
import { marketplaceIntegrationsUrl } from '@/pages/admin-settings/integrations-settings/lib/marketplace-integrations-url';
import { useDropdownDialogTransition } from '@/shared/hooks/useDropdownDialogTransition';
import { CreateCustomDialog } from './create-custom-dialog';

interface AddIntegrationMenuProps {
  buttonText?: string;
  showIcon?: boolean;
}

export function AddIntegrationMenu({
  buttonText,
  showIcon = false,
}: Readonly<AddIntegrationMenuProps>) {
  const { t } = useTranslation('admin-settings-integrations');
  const navigate = useNavigate();
  const marketplaceUrl = marketplaceIntegrationsUrl(useMarketplaceConfig());
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const { requestDialogOpen, handleCloseAutoFocus } =
    useDropdownDialogTransition();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" data-testid="add-integration-menu">
            {showIcon && <Plus className="h-4 w-4" />}
            {buttonText ?? t('integrations.page.add')}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={handleCloseAutoFocus}
        >
          <DropdownMenuItem
            data-testid="add-integration-mcp-server"
            onClick={() => requestDialogOpen(() => setIsCustomOpen(true))}
          >
            <Server />
            <span>{t('integrations.page.addMcpServer')}</span>
          </DropdownMenuItem>
          {marketplaceUrl && (
            <DropdownMenuItem
              data-testid="add-integration-marketplace"
              onClick={() =>
                window.open(marketplaceUrl, '_blank', 'noopener,noreferrer')
              }
            >
              <Store />
              <span>{t('integrations.page.addFromMarketplace')}</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateCustomDialog
        open={isCustomOpen}
        onOpenChange={setIsCustomOpen}
        onSaved={(saved) =>
          void navigate({
            to: '/admin-settings/integrations',
            search: { integration: saved.id },
          })
        }
      />
    </>
  );
}
