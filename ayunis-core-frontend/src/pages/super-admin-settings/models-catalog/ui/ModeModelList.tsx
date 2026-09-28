import { Fragment, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { ItemGroup, ItemSeparator } from '@ayunis/ui/components/item';
import type { LanguageModelResponseDto } from '@/shared/api';
import { moveById } from '@/shared/lib/move-by-id';
import { ProviderFlag } from '@/shared/ui/provider-flag';
import type { ModelMode } from '@/widgets/model-select-options';
import { ModeModelRow } from './ModeModelRow';

const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

interface ModeModelListProps {
  mode: ModelMode;
  languageModels: LanguageModelResponseDto[];
}

export function ModeModelList({
  mode,
  languageModels,
}: Readonly<ModeModelListProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const [rankedIds, setRankedIds] = useState<string[]>([]);
  const [disabledIds, setDisabledIds] = useState<string[]>([]);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const modelsById = new Map(languageModels.map((model) => [model.id, model]));
  const rankedModels = rankedIds
    .map((id) => modelsById.get(id))
    .filter((model) => model !== undefined);
  const visibleIds = rankedModels.map((model) => model.id);
  const addableModels = languageModels
    .filter((model) => !visibleIds.includes(model.id))
    .filter((model) => mode !== 'max' || model.tier === 'high')
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const moved = moveById(rankedModels, String(active.id), String(over.id));
    if (moved) setRankedIds(moved.map((model) => model.id));
  };

  const handleRemove = (modelId: string) => {
    setRankedIds((ids) => ids.filter((id) => id !== modelId));
    setDisabledIds((ids) => ids.filter((id) => id !== modelId));
  };

  const handleToggle = (modelId: string, isEnabled: boolean) => {
    setDisabledIds((ids) =>
      isEnabled ? ids.filter((id) => id !== modelId) : [...ids, modelId],
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(`models.modes.${mode}.title`)}</CardTitle>
        <CardDescription>
          {t(`models.modes.${mode}.description`)}
        </CardDescription>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={addableModels.length === 0}
              >
                {t('models.modes.add')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {addableModels.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => setRankedIds([...visibleIds, model.id])}
                >
                  <ProviderFlag provider={model.provider} />
                  {model.displayName}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent>
        {rankedModels.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t('models.modes.empty')}
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={visibleIds}
              strategy={verticalListSortingStrategy}
            >
              <ItemGroup>
                {rankedModels.map((model, index) => (
                  <Fragment key={model.id}>
                    <ModeModelRow
                      model={model}
                      position={index + 1}
                      isEnabled={!disabledIds.includes(model.id)}
                      onToggle={handleToggle}
                      onRemove={handleRemove}
                    />
                    {index < rankedModels.length - 1 && <ItemSeparator />}
                  </Fragment>
                ))}
              </ItemGroup>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}
