import { Card, CardContent } from '@/shared/ui/shadcn/card';
import {
  ModelWithConfigResponseDtoProvider,
  type ModelWithConfigResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import ModelProviderCard from './ModelProviderCard';
import { OrgDefaultModelCard } from './OrgDefaultModelCard';
import SettingsLayout from '../../admin-settings-layout';
import { useTranslation } from 'react-i18next';
import { useModelsWithConfig, useProvidersWithPermittedStatus } from '../api';

export default function ModelSettingsPage() {
  const { t } = useTranslation('admin-settings-models');
  const { models, isLoading: modelsLoading } = useModelsWithConfig();
  const languageModels = models.filter((model) => !model.isEmbedding);
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

  const modelProviderCards = providerPriority
    .map((provider) => {
      if (!groupedModels[provider]) {
        return null;
      }

      const providerInfo = providers.find((p) => p.provider === provider);
      if (!providerInfo) {
        return null;
      }

      return (
        <ModelProviderCard
          key={provider}
          provider={providerInfo}
          models={groupedModels[provider]}
        />
      );
    })
    .filter(Boolean);

  return (
    <SettingsLayout>
      <div className="space-y-4">
        <OrgDefaultModelCard
          models={languageModels}
          isLoading={modelsLoading}
        />
        {modelProviderCards.length > 0 && modelProviderCards}
        {modelProviderCards.length === 0 && (
          <Card>
            <CardContent>
              <div className="text-center text-muted-foreground">
                <p>{t('models.noModelsAvailable')}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SettingsLayout>
  );
}
