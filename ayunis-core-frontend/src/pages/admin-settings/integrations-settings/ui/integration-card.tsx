import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/shadcn/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/shadcn/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/shadcn/dropdown-menu";
import { Switch } from "@/shared/ui/shadcn/switch";
import { Label } from "@/shared/ui/shadcn/label";
import { MoreVertical, CheckCircle2 } from "lucide-react";
import type { McpIntegration } from "../model/types";
import { getIntegrationTypeLabel, getAuthMethodLabel } from "../lib/helpers";

interface IntegrationCardProps {
  integration: McpIntegration;
  onEdit: (integration: McpIntegration) => void;
  onDelete: (integration: McpIntegration) => void;
  onToggleEnabled: (integration: McpIntegration, enabled: boolean) => void;
  onValidate: (integration: McpIntegration) => void;
  isTogglingEnabled?: boolean;
  isValidating?: boolean;
  isAdmin?: boolean;
}

export function IntegrationCard({
  integration,
  onEdit,
  onDelete,
  onToggleEnabled,
  onValidate,
  isTogglingEnabled = false,
  isValidating = false,
  isAdmin = false,
}: IntegrationCardProps) {
  const { t } = useTranslation("admin-settings-integrations");
  const typeLabel = getIntegrationTypeLabel(integration.type);
  const authLabel = getAuthMethodLabel(integration.authMethod);
  const integrationKey = `integration-${integration.id}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>{integration.name}</span>
        </CardTitle>
        <CardDescription>
          {integration.type === "predefined"
            ? `${typeLabel} - ${integration.slug}`
            : `${typeLabel} - ${integration.serverUrl}`}
        </CardDescription>
        {isAdmin && (
          <CardAction>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onValidate(integration)}
                disabled={isValidating}
              >
                {isValidating
                  ? t("integrations.card.testing")
                  : t("integrations.card.testConnection")}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">
                      {t("integrations.card.openMenu")}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(integration)}>
                    {t("integrations.card.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(integration)}
                    className="text-red-600"
                  >
                    {t("integrations.card.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={integrationKey} className="font-medium">
              {t("integrations.card.enableIntegration")}
            </Label>
            {isAdmin && (
              <Switch
                id={integrationKey}
                checked={integration.enabled}
                onCheckedChange={(checked) =>
                  onToggleEnabled(integration, checked)
                }
                disabled={isTogglingEnabled}
              />
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t("integrations.card.authentication")}
            </span>
            <span>{authLabel}</span>
          </div>

          {integration.hasCredentials && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("integrations.card.credentials")}
              </span>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
