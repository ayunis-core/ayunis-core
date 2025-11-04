import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/shadcn/dropdown-menu";
import { Switch } from "@/shared/ui/shadcn/switch";
import { MoreVertical, Loader2 } from "lucide-react";
import type { McpIntegration } from "../model/types";
import { getIntegrationTypeLabel } from "../lib/helpers";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/shared/ui/shadcn/item";

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
}: IntegrationCardProps) {
  const { t } = useTranslation("admin-settings-integrations");
  const typeLabel = getIntegrationTypeLabel(integration.type);
  const integrationKey = `integration-${integration.id}`;

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>{integration.name}</ItemTitle>
        <ItemDescription>
          {integration.type === "predefined"
            ? ``
            : `${typeLabel} - ${integration.serverUrl}`}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Switch
          id={integrationKey}
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
            ? t("integrations.card.testing")
            : t("integrations.card.testConnection")}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">{t("integrations.card.openMenu")}</span>
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
      </ItemActions>
    </Item>
  );
}
