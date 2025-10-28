import { Card, CardContent } from "@/shared/ui/shadcn/card";
import { useMemo, useState } from "react";
import {
  ModelWithConfigResponseDtoProvider,
  type ModelWithConfigResponseDto,
} from "@/shared/api/generated/ayunisCoreAPI.schemas";
import ModelProviderCard from "./ModelProviderCard";
import SettingsLayout from "../../admin-settings-layout";
import { useTranslation } from "react-i18next";
import { useModelsWithConfig, useProvidersWithPermittedStatus } from "../api";
import ConfigureModelsBanner from "./ConfigureModelsBanner";
import ProviderTabs from "./ProviderTabs";

export default function ModelSettingsPage() {
  const { t } = useTranslation("admin-settings-models");
  const { models } = useModelsWithConfig();
  const { providers } = useProvidersWithPermittedStatus();

  // Group models by provider
  const groupedModels = models.reduce(
    (acc, model) => {
      acc[model.provider] = acc[model.provider] || [];
      acc[model.provider].push(model);
      return acc;
    },
    {} as Record<
      ModelWithConfigResponseDtoProvider,
      ModelWithConfigResponseDto[]
    >,
  );

  const providerPriority: Array<ModelWithConfigResponseDtoProvider> = [
    ModelWithConfigResponseDtoProvider.ayunis,
    ModelWithConfigResponseDtoProvider.synaforce,
    ModelWithConfigResponseDtoProvider.mistral,
    ModelWithConfigResponseDtoProvider.ollama,
    ModelWithConfigResponseDtoProvider.anthropic,
    ModelWithConfigResponseDtoProvider.openai,
  ];

  type TabKey = "enabled" | "eu" | "intl" | "self";
  const [tab, setTab] = useState<TabKey>("enabled");

  const EU: ModelWithConfigResponseDtoProvider[] = [
  ModelWithConfigResponseDtoProvider.mistral,
  ModelWithConfigResponseDtoProvider.ayunis,
  ModelWithConfigResponseDtoProvider.synaforce,
];
const INTL: ModelWithConfigResponseDtoProvider[] = [
  ModelWithConfigResponseDtoProvider.openai,
  ModelWithConfigResponseDtoProvider.anthropic,
];
const SELF: ModelWithConfigResponseDtoProvider[] = [
  ModelWithConfigResponseDtoProvider.ollama,
];

  const permittedProviderIds = useMemo(
    () => new Set(providers.filter((p) => p.isPermitted).map((p) => p.provider)),
    [providers],
  );

  const visibleProviderIds: Array<ModelWithConfigResponseDtoProvider> = useMemo(() => {
    switch (tab) {
      case "eu":
        return EU;
      case "intl":
        return INTL;
      case "self":
        return SELF;
      case "enabled":
      default:
        return providerPriority.filter((p) => {
          const providerPermitted = permittedProviderIds.has(p);
          const anyModelPermitted = (groupedModels[p]?.some((m) => (m as any).isPermitted)) ?? false;
          return providerPermitted || anyModelPermitted;
        });
    }
  }, [tab, EU, INTL, SELF, providerPriority, permittedProviderIds]);

  const modelProviderCards = providerPriority
    .filter((provider) => visibleProviderIds.includes(provider))
    .map((provider) =>
      groupedModels[provider] ? (
        <ModelProviderCard
          key={provider}
          provider={providers.find((p) => p.provider === provider)!}
          models={groupedModels[provider]}
        />
      ) : null,
    );

  return (
    <SettingsLayout>
      <div className="space-y-4 px-2">
        <ConfigureModelsBanner />
        <ProviderTabs selected={tab} onChange={setTab} />

        {modelProviderCards.length > 0 && modelProviderCards}
        {modelProviderCards.length === 0 && (
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
