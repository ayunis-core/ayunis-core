import { useMemo, useState } from "react";
import {
  ModelWithConfigResponseDtoProvider,
} from "@/shared/api/generated/ayunisCoreAPI.schemas";
import ModelProviderCard from "./ModelProviderCard";
import SettingsLayout from "../../admin-settings-layout";
import { useModelsWithConfig, useProvidersWithPermittedStatus } from "../api";
import ProviderTabs from "./ProviderTabs";
import ModelsEmptyState from "./ModelsEmptyState";

export default function ModelSettingsPage() {
  const { models } = useModelsWithConfig();
  const { providers } = useProvidersWithPermittedStatus();

  type TabKey = "recommended" | "self";
  const [tab, setTab] = useState<TabKey>("recommended");

  const SELF: ModelWithConfigResponseDtoProvider[] = [
    ModelWithConfigResponseDtoProvider.ollama,
  ];

  const RECOMMENDED: ModelWithConfigResponseDtoProvider[] = [
    ModelWithConfigResponseDtoProvider.ayunis,
    ModelWithConfigResponseDtoProvider.synaforce,
    ModelWithConfigResponseDtoProvider.mistral,
    ModelWithConfigResponseDtoProvider.anthropic,
    ModelWithConfigResponseDtoProvider.openai,
  ];

  const visibleProviderIds: Array<ModelWithConfigResponseDtoProvider> = useMemo(() => {
    switch (tab) {
      case "self":
        return SELF;
      case "recommended":
      default:
        return RECOMMENDED;
    }
  }, [tab, RECOMMENDED, SELF]);

  // Aggregate all models from visible providers
  const aggregatedModels = useMemo(() => {
    return models.filter((model) => visibleProviderIds.includes(model.provider));
  }, [models, visibleProviderIds]);

  const hasModels = aggregatedModels.length > 0;

  // Create providers map for permission checking
  const providersMap = useMemo(() => {
    return providers.map((p) => ({
      provider: p.provider,
      isPermitted: p.isPermitted,
    }));
  }, [providers]);

  return (
    <SettingsLayout>
      <div className="space-y-4 px-2">
        <ProviderTabs selected={tab} onChange={setTab} />

        {hasModels && (
          <ModelProviderCard
            cardType={tab}
            models={aggregatedModels}
            providers={providersMap}
          />
        )}

        {!hasModels && <ModelsEmptyState tab={tab} />}
      </div>
    </SettingsLayout>
  );
}
