import { Card, CardContent } from '@/shared/ui/shadcn/card';
import { Alert, AlertTitle, AlertDescription } from '@/shared/ui/shadcn/alert';
import { Info, TriangleAlert } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import ModelTypeCard from './ModelTypeCard';
import { OrgDefaultModelCard } from './OrgDefaultModelCard';
import SettingsLayout from '../../admin-settings-layout';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { Trans, useTranslation } from 'react-i18next';
import {
  useLanguageModels,
  useEmbeddingModels,
  useImageGenerationModels,
} from '@/features/models';

export default function ModelSettingsPage() {
  const { t } = useTranslation('admin-settings-models');
  const { t: tLayout } = useTranslation('admin-settings-layout');
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
              <ModelTypeCard type="language" models={languageModels} />
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

  return (
    <SettingsLayout
      action={<HelpLink path="settings/admin/models/" />}
      title={tLayout('layout.models')}
    >
      <div className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>{t('models.teamHint.title')}</AlertTitle>
          <AlertDescription>
            <span>
              <Trans
                i18nKey="models.teamHint.description"
                ns="admin-settings-models"
                components={{
                  teamsLink: (
                    <Link
                      to="/admin-settings/teams"
                      className="font-medium underline underline-offset-4 hover:text-primary"
                    />
                  ),
                }}
              />
            </span>
          </AlertDescription>
        </Alert>
        {renderModelsContent()}
      </div>
    </SettingsLayout>
  );
}
