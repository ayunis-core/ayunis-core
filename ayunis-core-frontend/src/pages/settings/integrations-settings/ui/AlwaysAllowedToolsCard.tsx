import { useTranslation } from 'react-i18next';
import { Plug } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Skeleton } from '@ayunis/ui/components/skeleton';
import { useMcpToolAllowances } from '@/pages/settings/integrations-settings/api/useMcpToolAllowances';
import { useRemoveMcpToolAllowance } from '@/pages/settings/integrations-settings/api/useRemoveMcpToolAllowance';
import {
  groupToolAllowancesByIntegration,
  type ToolAllowanceGroup,
} from '@/pages/settings/integrations-settings/lib/group-tool-allowances';

export function AlwaysAllowedToolsCard() {
  const { t } = useTranslation('settings');

  return (
    <Card data-testid="always-allowed-tools">
      <CardHeader>
        <CardTitle>{t('integrations.alwaysAllowed.title')}</CardTitle>
        <CardDescription>
          {t('integrations.alwaysAllowed.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlwaysAllowedToolsContent />
      </CardContent>
    </Card>
  );
}

function AlwaysAllowedToolsContent() {
  const { t } = useTranslation('settings');
  const { allowances, isLoading, isError, refetch } = useMcpToolAllowances();
  const removeAllowance = useRemoveMcpToolAllowance();

  if (isLoading) {
    return <Skeleton className="h-12 w-full" />;
  }

  if (isError) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {t('integrations.alwaysAllowed.failedToLoad')}
        </p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          {t('integrations.retry')}
        </Button>
      </div>
    );
  }

  if (allowances.length === 0) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid="always-allowed-tools-empty"
      >
        {t('integrations.alwaysAllowed.empty')}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {groupToolAllowancesByIntegration(allowances).map((group) => (
        <IntegrationToolGroup
          key={group.integrationId}
          group={group}
          onRemove={(id) => removeAllowance.mutate(id)}
          isRemoving={removeAllowance.isPending}
        />
      ))}
    </div>
  );
}

function IntegrationToolGroup({
  group,
  onRemove,
  isRemoving,
}: Readonly<{
  group: ToolAllowanceGroup;
  onRemove: (id: string) => void;
  isRemoving: boolean;
}>) {
  const { t } = useTranslation('settings');

  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        {group.integrationLogoUrl ? (
          <img
            src={group.integrationLogoUrl}
            alt=""
            className="h-4 w-4 flex-shrink-0 rounded-sm object-contain"
          />
        ) : (
          <Plug className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        )}
        {group.integrationName}
      </h3>
      <ItemGroup className="gap-2">
        {group.allowances.map((allowance) => (
          <Item
            key={allowance.id}
            variant="outline"
            size="sm"
            role="listitem"
            data-testid={`always-allowed-tool-${group.integrationId}-${allowance.toolName}`}
          >
            <ItemContent>
              <ItemTitle className="font-mono">{allowance.toolName}</ItemTitle>
            </ItemContent>
            <ItemActions>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRemove(allowance.id)}
                disabled={isRemoving}
                data-testid="always-allowed-tool-remove"
              >
                {t('integrations.alwaysAllowed.remove')}
              </Button>
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </section>
  );
}
