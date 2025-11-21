import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/shared/ui/shadcn/card';
import { Switch } from '@/shared/ui/shadcn/switch';
import { Separator } from '@/shared/ui/shadcn/separator';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import { useTranslation } from 'react-i18next';
import { useParams } from '@tanstack/react-router';
import { useAgentMcpIntegrationsQueries } from '../api/useAgentMcpIntegrationsQueries';
import { useAssignMcpIntegration } from '../api/useAssignMcpIntegration';
import { useUnassignMcpIntegration } from '../api/useUnassignMcpIntegration';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
import { cn } from '@/shared/lib/shadcn/utils';

export default function AgentMcpIntegrationsCard({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const { t } = useTranslation('agent');
  const { id: agentId } = useParams({ from: '/_authenticated/agents/$id' });

  // Fetch available and assigned integrations
  const {
    availableIntegrations,
    assignedIntegrations,
    isLoading,
    isError,
    refetch,
  } = useAgentMcpIntegrationsQueries(agentId);

  // Mutation hooks with optimistic updates
  const assignMutation = useAssignMcpIntegration(availableIntegrations);
  const unassignMutation = useUnassignMcpIntegration();

  // Check if integration is assigned
  const isAssigned = (integrationId: string): boolean => {
    return assignedIntegrations?.some((a) => a.id === integrationId) ?? false;
  };

  // Handle toggle
  const handleToggle = async (integrationId: string) => {
    const currentState = isAssigned(integrationId);
    if (currentState) {
      await unassignMutation.mutateAsync({ agentId, integrationId });
    } else {
      await assignMutation.mutateAsync({ agentId, integrationId });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('mcpIntegrations.title')}</CardTitle>
          <CardDescription>{t('mcpIntegrations.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('mcpIntegrations.title')}</CardTitle>
          <CardDescription>{t('mcpIntegrations.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-sm text-destructive mb-4">
              {t('mcpIntegrations.errors.failedToLoad')}
            </p>
            <button
              onClick={refetch}
              className="text-sm text-primary hover:underline"
            >
              {t('mcpIntegrations.retryButton')}
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!availableIntegrations || availableIntegrations.length === 0) {
    return null;
  }

  // Sort integrations alphabetically by name
  const sortedIntegrations = [...availableIntegrations].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('mcpIntegrations.title')}</CardTitle>
        <CardDescription>{t('mcpIntegrations.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedIntegrations.map((integration, index) => {
            const assigned = isAssigned(integration.id);
            const isPending =
              assignMutation.isPending || unassignMutation.isPending;

            return (
              <div key={integration.id}>
                {index > 0 && <Separator className="my-4" />}
                <Item
                  className={cn(
                    index === 0 && 'pt-0',
                    index === sortedIntegrations.length - 1 && 'pb-0',
                    'px-0',
                  )}
                >
                  <ItemContent>
                    <ItemTitle>{integration.name}</ItemTitle>
                  </ItemContent>
                  <ItemActions>
                    <Switch
                      checked={assigned}
                      onCheckedChange={() => void handleToggle(integration.id)}
                      disabled={disabled || isPending}
                      aria-label={t('mcpIntegrations.toggleAriaLabel', {
                        name: integration.name,
                      })}
                    />
                  </ItemActions>
                </Item>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
