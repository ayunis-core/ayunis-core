import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/shadcn/alert';
import { Card, CardContent } from '@/shared/ui/shadcn/card';
import ModelTypeCard from './ModelTypeCard';
import { useSuperAdminModels } from '../api/useSuperAdminModels';
import { useTranslation } from 'react-i18next';
import { SuperAdminOrgDefaultModelCard } from './SuperAdminOrgDefaultModelCard';
import { TriangleAlert } from 'lucide-react';

interface ModelsSectionProps {
  orgId: string;
}

export default function ModelsSection({ orgId }: Readonly<ModelsSectionProps>) {
  const { t } = useTranslation('admin-settings-models');
  const {
    languageModels,
    embeddingModels,
    imageGenerationModels,
    isLoading,
    hasLanguageError,
    hasEmbeddingError,
    hasImageGenerationError,
    hasPartialError,
    hasCriticalError,
  } = useSuperAdminModels(orgId);

  if (isLoading) {
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

  const hasModels =
    languageModels.length > 0 ||
    embeddingModels.length > 0 ||
    imageGenerationModels.length > 0;

  return (
    <div className="space-y-4">
      {hasCriticalError ? (
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>{t('models.loadErrorTitle')}</AlertTitle>
          <AlertDescription>
            {t('models.loadErrorDescription')}
          </AlertDescription>
        </Alert>
      ) : (
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
            <SuperAdminOrgDefaultModelCard
              models={languageModels}
              isLoading={isLoading}
              orgId={orgId}
            />
          )}
          {hasModels ? (
            <>
              {!hasLanguageError && (
                <ModelTypeCard
                  type="language"
                  models={languageModels}
                  orgId={orgId}
                />
              )}
              {!hasEmbeddingError && (
                <ModelTypeCard
                  type="embedding"
                  models={embeddingModels}
                  orgId={orgId}
                />
              )}
              {!hasImageGenerationError && (
                <ModelTypeCard
                  type="image-generation"
                  models={imageGenerationModels}
                  orgId={orgId}
                />
              )}
            </>
          ) : (
            <Card>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  <p>{t('models.noModelsAvailable')}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
