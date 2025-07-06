import { Card, CardContent } from "@/shared/ui/shadcn/card";
import { type ModelWithConfigResponseDto } from "@/shared/api/generated/ayunisCoreAPI.schemas";
import ModelProviderCard from "./ModelProviderCard";
import SettingsLayout from "../../admin-settings-layout";
import { useTranslation } from "react-i18next";
import { useModelsWithConfig, useProvidersWithPermittedStatus } from "../api";

export default function ModelSettingsPage() {
  const { t } = useTranslation("admin-settings");
  const { models } = useModelsWithConfig();
  const { providers } = useProvidersWithPermittedStatus();

  // Group models by provider
  const groupedModels = models.reduce(
    (acc, model) => {
      acc[model.provider] = acc[model.provider] || [];
      acc[model.provider].push(model);
      return acc;
    },
    {} as Record<string, ModelWithConfigResponseDto[]>,
  );

  return (
    <SettingsLayout>
      <div className="space-y-4">
        {Object.keys(groupedModels).length > 0 &&
          Object.entries(groupedModels).map(([provider, providerModels]) => (
            <ModelProviderCard
              key={provider}
              provider={providers.find((p) => p.provider === provider)!}
              models={providerModels}
            />
          ))}
        {Object.keys(groupedModels).length === 0 && (
          <Card>
            <CardContent>
              <div className="text-center text-muted-foreground">
                <p>{t("models.noModelsAvailable")}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SettingsLayout>
  );
}
