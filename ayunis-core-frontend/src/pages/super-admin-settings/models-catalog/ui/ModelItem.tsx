import type { SuperAdminCatalogModelsControllerGetAllCatalogModels200Item } from '@/shared/api';
import { isLanguageModel, isEmbeddingModel } from '@/features/models';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
  ItemActions,
} from '@/shared/ui/shadcn/item';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Button } from '@/shared/ui/shadcn/button';
import { Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ModelItemProps {
  model: SuperAdminCatalogModelsControllerGetAllCatalogModels200Item;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export function ModelItem({
  model,
  onEdit,
  onDelete,
  isDeleting,
}: Readonly<ModelItemProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const isLanguage = isLanguageModel(model);
  const isEmbedding = isEmbeddingModel(model);
  const typeLabels = {
    language: t('models.catalog.languageModelType'),
    embedding: t('models.catalog.embeddingModelType'),
    'image-generation': t('models.catalog.imageGenerationModelType'),
  } as const;

  return (
    <Item>
      <ItemContent>
        <ItemTitle>
          {model.displayName}
          {model.isArchived && (
            <Badge variant="secondary" className="ml-2">
              {t('models.catalog.archivedBadge')}
            </Badge>
          )}
        </ItemTitle>
        <ItemDescription>
          <span className="font-medium">{model.name}</span> · {model.provider}
        </ItemDescription>
      </ItemContent>
      <ItemContent>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">{typeLabels[model.type]}</Badge>
          {isLanguage && (
            <>
              {model.canStream && (
                <Badge variant="outline">
                  {t('models.catalog.streamingBadge')}
                </Badge>
              )}
              {model.canUseTools && (
                <Badge variant="outline">
                  {t('models.catalog.toolsBadge')}
                </Badge>
              )}
              {model.isReasoning && (
                <Badge variant="outline">
                  {t('models.catalog.reasoningBadge')}
                </Badge>
              )}
            </>
          )}
          {isEmbedding && <Badge variant="outline">{model.dimensions}d</Badge>}
        </div>
      </ItemContent>
      <ItemActions>
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </ItemActions>
    </Item>
  );
}
