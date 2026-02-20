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
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
import { cn } from '@/shared/lib/shadcn/utils';
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
                      aria-label={translations.toggleAriaLabel(
                        integration.name,
                      )}
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
