import type {
  EmbeddingModelResponseDto,
  LanguageModelResponseDto,
  SuperAdminModelsControllerGetAllCatalogModels200Item,
} from '@/shared/api';
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

interface ModelItemProps {
  model: SuperAdminModelsControllerGetAllCatalogModels200Item;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export function ModelItem({
  model,
  onEdit,
  onDelete,
  isDeleting,
}: ModelItemProps) {
  const isLanguage = isLanguageModel(model);
  const isEmbedding = isEmbeddingModel(model);

  return (
    <Item>
      <ItemContent>
        <ItemTitle>
          {model.displayName}
          {model.isArchived && (
            <Badge variant="secondary" className="ml-2">
              Archived
            </Badge>
          )}
        </ItemTitle>
        <ItemDescription>
          <span className="font-medium">{model.name}</span> · {model.provider}
        </ItemDescription>
      </ItemContent>
      <ItemContent>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">{model.type}</Badge>
          {isLanguage && (
            <>
              {model.canStream && <Badge variant="outline">Streaming</Badge>}
              {model.canUseTools && <Badge variant="outline">Tools</Badge>}
              {model.isReasoning && <Badge variant="outline">Reasoning</Badge>}
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
