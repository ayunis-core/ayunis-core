import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/shared/ui/shadcn/card";
import { FileQuestion } from "lucide-react";
import type { McpIntegration } from "../model/types";
import { IntegrationCard } from "./integration-card";
import { useToggleIntegration } from "../api/useToggleIntegration";
import { useValidateIntegration } from "../api/useValidateIntegration";

interface IntegrationsListProps {
  integrations: McpIntegration[];
  onEdit: (integration: McpIntegration) => void;
  onDelete: (integration: McpIntegration) => void;
  isAdmin?: boolean;
}

export function IntegrationsList({
  integrations,
  onEdit,
  onDelete,
  isAdmin = false,
}: IntegrationsListProps) {
  const { t } = useTranslation("admin-settings-integrations");
  const { toggleIntegration, togglingIds } = useToggleIntegration();
  const { validateIntegration, validatingIds } = useValidateIntegration();

  if (integrations.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileQuestion className="mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">
              {t("integrations.list.noIntegrationsTitle")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("integrations.list.noIntegrationsMessage")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {integrations
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleEnabled={toggleIntegration}
            onValidate={validateIntegration}
            isTogglingEnabled={togglingIds.has(integration.id)}
            isValidating={validatingIds.has(integration.id)}
            isAdmin={isAdmin}
          />
        ))}
    </div>
  );
}
