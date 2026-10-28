import { Card, CardContent } from '@ayunis/ui/components/card';
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from '@ayunis/ui/components/alert';
import { TriangleAlert } from 'lucide-react';
import ModelTypeCard from './ModelTypeCard';
import { OrgDefaultModelCard } from './OrgDefaultModelCard';

import { OnboardingTourTarget, TOUR_TARGET } from '@/widgets/onboarding';
import { useTranslation } from 'react-i18next';
import {
  useLanguageModels,
  useEmbeddingModels,
  useImageGenerationModels,
} from '@/features/models';

export default function OrganizationModels() {
  const { t } = useTranslation('admin-settings-models');
  const {
    models: languageModels,
    isLoading: isLoadingLanguage,
    isError: hasLanguageError,
  } = useLanguageModels();
  const {
    models: embeddingModels,
    isLoading: isLoadingEmbedding,
    isError: hasEmbeddingError,
  } = useEmbeddingModels();
  const {
    models: imageGenerationModels,
    isLoading: isLoadingImageGen,
    isError: hasImageGenerationError,
  } = useImageGenerationModels();

  const modelsLoading =
    isLoadingLanguage || isLoadingEmbedding || isLoadingImageGen;
  const hasAnyError =
    hasLanguageError || hasEmbeddingError || hasImageGenerationError;
  const hasCriticalError =
    hasLanguageError && hasEmbeddingError && hasImageGenerationError;
  const hasPartialError = hasAnyError && !hasCriticalError;
  const hasModels =
    languageModels.length > 0 ||
    embeddingModels.length > 0 ||
    imageGenerationModels.length > 0;

  const renderModelsContent = () => {
    if (modelsLoading) {
      return (
        <Card>
          <CardContent>
            <div className="text-center text-muted-foreground py-8">
              <p>{t('models.loading')}</p>
            </div>
          </CardContent>
        </Card>
      );
    }
    if (hasCriticalError) {
      return (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>{t('models.loadErrorTitle')}</AlertTitle>
          <AlertDescription>
            {t('models.loadErrorDescription')}
          </AlertDescription>
        </Alert>
      );
    }
    return (
      <>
        {hasPartialError && (
          <Alert variant="warning">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>{t('models.partialData.title')}</AlertTitle>
            <AlertDescription>
              {t('models.partialData.someUnavailable')}
            </AlertDescription>
          </Alert>
        )}
        {!hasLanguageError && (
          <OrgDefaultModelCard
            models={languageModels}
            isLoading={modelsLoading}
          />
        )}
        {hasModels ? (
          <>
            {!hasLanguageError && (
              <OnboardingTourTarget name={TOUR_TARGET.configureModelsLanguage}>
                <ModelTypeCard type="language" models={languageModels} />
              </OnboardingTourTarget>
            )}
            {!hasEmbeddingError && (
              <ModelTypeCard type="embedding" models={embeddingModels} />
            )}
            {!hasImageGenerationError && (
              <ModelTypeCard
                type="image-generation"
                models={imageGenerationModels}
              />
            )}
          </>
        ) : (
          <Card>
            <CardContent>
              <div className="text-center text-muted-foreground">
                <p>{t('models.noModelsAvailable')}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </>
    );
  };

  return <div className="space-y-4">{renderModelsContent()}</div>;
}
