import { Card, CardContent } from "@/shared/ui/shadcn/card";
import {
  ModelWithConfigResponseDtoProvider,
  type ModelWithConfigResponseDto,
} from "@/shared/api/generated/ayunisCoreAPI.schemas";
import ModelProviderCard from "./ModelProviderCard";
import { useSuperAdminModels } from "../api/useSuperAdminModels";
import { useTranslation } from "react-i18next";

interface ModelsSectionProps {
  orgId: string;
}

export default function ModelsSection({ orgId }: ModelsSectionProps) {
  const { t } = useTranslation("admin-settings-models");
  const { models, providers, isLoading } = useSuperAdminModels(orgId);

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <p>{t("models.loading")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group models by provider
  const groupedModels = models.reduce(
    (
      acc: Record<
        ModelWithConfigResponseDtoProvider,
        ModelWithConfigResponseDto[]
      >,
      model: ModelWithConfigResponseDto,
    ) => {
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

  const modelProviderCards = providerPriority.map((provider) =>
    groupedModels[provider] ? (
      <ModelProviderCard
        key={provider}
        provider={
          providers.find(
            (p: { provider: ModelWithConfigResponseDtoProvider }) =>
              p.provider === provider,
          )!
        }
        models={groupedModels[provider]}
        orgId={orgId}
      />
    ) : null,
  );

  return (
    <div className="space-y-4">
      {modelProviderCards.length > 0 && modelProviderCards}
      {modelProviderCards.length === 0 && (
        <Card>
          <CardContent>
            <div className="text-center text-muted-foreground py-8">
              <p>{t("models.noModelsAvailable")}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
