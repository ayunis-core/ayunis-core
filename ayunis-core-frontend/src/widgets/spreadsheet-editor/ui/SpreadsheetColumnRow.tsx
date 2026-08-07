import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@ayunis/ui/lib/cn';
import { Button } from '@ayunis/ui/components/button';
import { Input } from '@ayunis/ui/components/input';
import { getColumnDragId } from '../model/column-reordering';

interface SpreadsheetColumnRowProps {
  readonly label: string;
  readonly index: number;
  readonly onRename: (index: number, label: string) => void;
  readonly onDelete: (index: number) => void;
}

export function SpreadsheetColumnRow({
  label,
  index,
  onRename,
  onDelete,
}: SpreadsheetColumnRowProps) {
  const { t } = useTranslation('artifacts');
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: getColumnDragId(index) });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('flex items-center gap-1', isDragging && 'z-10 opacity-60')}
    >
      <Button
        ref={setActivatorNodeRef}
        variant="ghost"
        size="sm"
        className="h-7 w-6 shrink-0 cursor-grab touch-none p-0"
        aria-label={t('spreadsheet.toolbar.dragToReorder')}
        title={t('spreadsheet.toolbar.dragToReorder')}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="text-muted-foreground size-3.5" />
      </Button>
      <Input
        className="h-7 text-xs"
        value={label}
        onChange={(e) => onRename(index, e.target.value)}
        aria-label={t('spreadsheet.toolbar.renameColumn', {
          number: index + 1,
        })}
      />
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 shrink-0 p-0"
        onClick={() => onDelete(index)}
        title={t('spreadsheet.toolbar.deleteColumn')}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
