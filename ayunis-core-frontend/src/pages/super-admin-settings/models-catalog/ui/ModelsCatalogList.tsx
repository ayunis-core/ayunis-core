import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { ItemGroup, ItemSeparator } from '@/shared/ui/shadcn/item';
import type {
  SuperAdminModelsControllerGetAllCatalogModels200Item,
  LanguageModelResponseDto,
  EmbeddingModelResponseDto,
} from '@/shared/api';
import { ModelItem } from './ModelItem';
import { Fragment } from 'react/jsx-runtime';

interface ModelsCatalogListProps {
  models: SuperAdminModelsControllerGetAllCatalogModels200Item[];
  onEditLanguageModel: (model: LanguageModelResponseDto) => void;
  onEditEmbeddingModel: (model: EmbeddingModelResponseDto) => void;
  onDeleteModel: (
    model: SuperAdminModelsControllerGetAllCatalogModels200Item,
  ) => void;
  isDeleting: boolean;
}

function isLanguageModel(
  model: SuperAdminModelsControllerGetAllCatalogModels200Item,
): model is LanguageModelResponseDto {
  return model.type === 'language';
}

function isEmbeddingModel(
  model: SuperAdminModelsControllerGetAllCatalogModels200Item,
): model is EmbeddingModelResponseDto {
  return model.type === 'embedding';
}

export default function ModelsCatalogList({
  models,
  onEditLanguageModel,
  onEditEmbeddingModel,
  onDeleteModel,
  isDeleting,
}: ModelsCatalogListProps) {
  const languageModels = models.filter(isLanguageModel);
  const embeddingModels = models.filter(isEmbeddingModel);

  return (
    <div className="space-y-6">
      {/* Language Models */}
      <Card>
        <CardHeader>
          <CardTitle>Language Models</CardTitle>
          <CardDescription>
            Models available for text generation and conversation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {languageModels.length === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-2 py-10 text-center">
              <h3 className="text-lg font-semibold">No language models</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                No language models have been added to the catalog yet.
              </p>
            </div>
          ) : (
            <ItemGroup>
              {languageModels.map((model, index) => (
                <Fragment key={model.id}>
                  <ModelItem
                    model={model}
                    onEdit={() => onEditLanguageModel(model)}
                    onDelete={() => onDeleteModel(model)}
                    isDeleting={isDeleting}
                  />
                  {index < languageModels.length - 1 && <ItemSeparator />}
                </Fragment>
              ))}
            </ItemGroup>
          )}
        </CardContent>
      </Card>

      {/* Embedding Models */}
      <Card>
        <CardHeader>
          <CardTitle>Embedding Models</CardTitle>
          <CardDescription>
            Models available for text embeddings and semantic search
          </CardDescription>
        </CardHeader>
        <CardContent>
          {embeddingModels.length === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-2 py-10 text-center">
              <h3 className="text-lg font-semibold">No embedding models</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                No embedding models have been added to the catalog yet.
              </p>
            </div>
          ) : (
            <ItemGroup>
              {embeddingModels.map((model, index) => (
                <Fragment key={model.id}>
                  <ModelItem
                    model={model}
                    onEdit={() => onEditEmbeddingModel(model)}
                    onDelete={() => onDeleteModel(model)}
                    isDeleting={isDeleting}
                  />
                  {index < embeddingModels.length - 1 && <ItemSeparator />}
                </Fragment>
              ))}
            </ItemGroup>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
