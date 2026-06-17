import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { ItemGroup, ItemSeparator } from '@/shared/ui/shadcn/item';
import type {
  SuperAdminCatalogModelsControllerGetAllCatalogModels200Item,
  LanguageModelResponseDto,
  EmbeddingModelResponseDto,
  ImageGenerationModelResponseDto,
} from '@/shared/api';
import {
  isLanguageModel,
  isEmbeddingModel,
  isImageGenerationModel,
} from '@/features/models';
import { ModelItem } from './ModelItem';
import { Fragment } from 'react/jsx-runtime';

interface ModelsCatalogListProps {
  models: SuperAdminCatalogModelsControllerGetAllCatalogModels200Item[];
  onEditLanguageModel: (model: LanguageModelResponseDto) => void;
  onEditEmbeddingModel: (model: EmbeddingModelResponseDto) => void;
  onEditImageGenerationModel: (model: ImageGenerationModelResponseDto) => void;
  onDeleteModel: (
    model: SuperAdminCatalogModelsControllerGetAllCatalogModels200Item,
  ) => void;
  isDeleting: boolean;
  isArchivedView?: boolean;
}

export default function ModelsCatalogList({
  models,
  onEditLanguageModel,
  onEditEmbeddingModel,
  onEditImageGenerationModel,
  onDeleteModel,
  isDeleting,
  isArchivedView = false,
}: Readonly<ModelsCatalogListProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const languageModels = models.filter(isLanguageModel);
  const embeddingModels = models.filter(isEmbeddingModel);
  const imageGenerationModels = models.filter(isImageGenerationModel);

  const editModel = (
    model: SuperAdminCatalogModelsControllerGetAllCatalogModels200Item,
  ) => {
    if (isLanguageModel(model)) onEditLanguageModel(model);
    else if (isEmbeddingModel(model)) onEditEmbeddingModel(model);
    else if (isImageGenerationModel(model)) onEditImageGenerationModel(model);
  };

  // Show a combined empty state for archived view when there are no archived models at all
  if (isArchivedView && models.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-2 py-16 text-center">
        <h3 className="text-lg font-semibold">{t('models.emptyArchived')}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {t('models.emptyArchivedDescription')}
        </p>
      </div>
    );
  }

  const modelTypeConfigs = [
    {
      titleKey: 'models.catalog.languageModels',
      descriptionKey: 'models.catalog.languageModelsDescription',
      emptyTitleKey: 'models.catalog.noLanguageModels',
      emptyArchivedKey: 'models.catalog.noLanguageModelsArchived',
      emptyActiveKey: 'models.catalog.noLanguageModelsEmpty',
      models: languageModels,
    },
    {
      titleKey: 'models.catalog.embeddingModels',
      descriptionKey: 'models.catalog.embeddingModelsDescription',
      emptyTitleKey: 'models.catalog.noEmbeddingModels',
      emptyArchivedKey: 'models.catalog.noEmbeddingModelsArchived',
      emptyActiveKey: 'models.catalog.noEmbeddingModelsEmpty',
      models: embeddingModels,
    },
    {
      titleKey: 'models.catalog.imageGenerationModels',
      descriptionKey: 'models.catalog.imageGenerationModelsDescription',
      emptyTitleKey: 'models.catalog.noImageGenerationModels',
      emptyArchivedKey: 'models.catalog.noImageGenerationModelsArchived',
      emptyActiveKey: 'models.catalog.noImageGenerationModelsEmpty',
      models: imageGenerationModels,
    },
  ];

  return (
    <div className="space-y-6">
      {modelTypeConfigs.map((config) => (
        <Card key={config.titleKey}>
          <CardHeader>
            <CardTitle>{t(config.titleKey)}</CardTitle>
            <CardDescription>{t(config.descriptionKey)}</CardDescription>
          </CardHeader>
          <CardContent>
            {config.models.length === 0 ? (
              <div className="flex flex-col items-center justify-center space-y-2 py-10 text-center">
                <h3 className="text-lg font-semibold">
                  {t(config.emptyTitleKey)}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {isArchivedView
                    ? t(config.emptyArchivedKey)
                    : t(config.emptyActiveKey)}
                </p>
              </div>
            ) : (
              <ItemGroup>
                {config.models.map((model, index) => (
                  <Fragment key={model.id}>
                    <ModelItem
                      model={model}
                      onEdit={() => editModel(model)}
                      onDelete={() => onDeleteModel(model)}
                      isDeleting={isDeleting}
                    />
                    {index < config.models.length - 1 && <ItemSeparator />}
                  </Fragment>
                ))}
              </ItemGroup>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
