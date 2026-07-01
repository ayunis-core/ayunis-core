import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import type { CourseModuleResponseDto } from '@/shared/api';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
import { Button } from '@/shared/ui/shadcn/button';
import { ExternalLink, GripVertical, Pencil, Trash2 } from 'lucide-react';

interface ModuleItemProps {
  module: CourseModuleResponseDto;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export function ModuleItem({
  module,
  onEdit,
  onDelete,
  isDeleting,
}: Readonly<ModuleItemProps>) {
  const { t } = useTranslation('super-admin-settings-academy');
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={isDragging ? 'z-10 opacity-60' : undefined}
    >
      <Item variant="outline" size="sm">
        <Button
          ref={setActivatorNodeRef}
          variant="ghost"
          size="icon"
          className="cursor-grab touch-none"
          aria-label={t('page.dragModule')}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </Button>
        <ItemContent>
          <ItemTitle>{module.title}</ItemTitle>
          {module.description && (
            <ItemDescription>{module.description}</ItemDescription>
          )}
        </ItemContent>
        <ItemActions>
          <Button variant="ghost" size="icon" asChild>
            <a href={module.loomUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
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
    </div>
  );
}
