import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/shared/ui/shadcn/card";
import { Switch } from "@/shared/ui/shadcn/switch";
import { Badge } from "@/shared/ui/shadcn/badge";
import { Separator } from "@/shared/ui/shadcn/separator";
import { Skeleton } from "@/shared/ui/shadcn/skeleton";
import { Plug } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useParams } from "@tanstack/react-router";
import { useAgentMcpIntegrationsQueries } from "../api/useAgentMcpIntegrationsQueries";
import { useAssignMcpIntegration } from "../api/useAssignMcpIntegration";
import { useUnassignMcpIntegration } from "../api/useUnassignMcpIntegration";

export default function AgentMcpIntegrationsCard() {
  const { t } = useTranslation("agent");
  const { id: agentId } = useParams({ from: "/_authenticated/agents/$id" });

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
          <CardTitle>{t("mcpIntegrations.title")}</CardTitle>
          <CardDescription>{t("mcpIntegrations.description")}</CardDescription>
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
          <CardTitle>{t("mcpIntegrations.title")}</CardTitle>
          <CardDescription>{t("mcpIntegrations.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-sm text-destructive mb-4">
              {t("mcpIntegrations.errors.failedToLoad")}
            </p>
            <button
              onClick={refetch}
              className="text-sm text-primary hover:underline"
            >
              {t("mcpIntegrations.retryButton")}
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!availableIntegrations || availableIntegrations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("mcpIntegrations.title")}</CardTitle>
          <CardDescription>{t("mcpIntegrations.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Plug className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="text-lg font-semibold mb-2">
              {t("mcpIntegrations.emptyState.title")}
            </h4>
            <p className="text-sm text-muted-foreground max-w-md">
              {t("mcpIntegrations.emptyState.description")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort integrations alphabetically by name
  const sortedIntegrations = [...availableIntegrations].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("mcpIntegrations.title")}</CardTitle>
        <CardDescription>{t("mcpIntegrations.description")}</CardDescription>
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
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold">
                        {integration.name}
                      </h4>
                      {integration.type && (
                        <Badge variant="outline" className="text-xs">
                          {integration.type}
                        </Badge>
                      )}
                    </div>
                    {integration.slug && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {integration.slug}
                      </p>
                    )}
                    {integration.serverUrl && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {integration.serverUrl}
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={assigned}
                    onCheckedChange={() => handleToggle(integration.id)}
                    disabled={isPending}
                    aria-label={t("mcpIntegrations.toggleAriaLabel", {
                      name: integration.name,
                    })}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
