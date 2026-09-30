import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@ayunis/ui/lib/cn';
import { Button } from '@ayunis/ui/components/button';
import { Switch } from '@ayunis/ui/components/switch';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import type { LanguageModelResponseDto } from '@/shared/api';
import { ProviderFlag } from '@/shared/ui/provider-flag';

interface ModeModelRowProps {
  model: LanguageModelResponseDto;
  position: number;
  isEnabled: boolean;
  onToggle: (modelId: string, isEnabled: boolean) => void;
  onRemove: (modelId: string) => void;
}

export function ModeModelRow({
  model,
  position,
  isEnabled,
  onToggle,
  onRemove,
}: Readonly<ModeModelRowProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: model.id });

  return (
    <Item
      ref={setNodeRef}
      size="sm"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('bg-card', isDragging && 'z-10 opacity-60')}
    >
      <ItemMedia className="gap-2">
        <Button
          ref={setActivatorNodeRef}
          variant="ghost"
          size="icon-sm"
          className="cursor-grab touch-none"
          aria-label={t('models.modes.dragToReorder')}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4 text-muted-foreground" />
        </Button>
        <span className="w-4 text-center text-sm tabular-nums text-muted-foreground">
          {position}
        </span>
      </ItemMedia>
      <ItemContent className={cn(!isEnabled && 'opacity-50')}>
        <ItemTitle>
          <ProviderFlag provider={model.provider} className="mr-1" />
          {model.displayName}
        </ItemTitle>
      </ItemContent>
      <ItemActions>
        <Switch
          checked={isEnabled}
          onCheckedChange={(checked) => onToggle(model.id, checked)}
          aria-label={t('models.modes.toggle', { name: model.displayName })}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(model.id)}
          aria-label={t('models.modes.remove')}
        >
          <Trash2 />
        </Button>
      </ItemActions>
    </Item>
  );
}
