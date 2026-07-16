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
import { Columns3, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/shadcn/popover';
import { useConfirmation } from '@/widgets/confirmation-modal';
import {
  resolveColumnReorder,
  getColumnDragId,
} from '../model/column-reordering';
import type { GridState } from '../model/spreadsheet-grid-state';
import { MAX_SPREADSHEET_COLUMNS } from '../model/spreadsheet-grid-state';
import { columnHasData } from '../model/spreadsheet-grid-operations';
import { SpreadsheetColumnRow } from './SpreadsheetColumnRow';

// Same as @dnd-kit/modifiers' restrictToVerticalAxis (package not installed)
const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

interface SpreadsheetColumnManagerProps {
  readonly gridState: GridState;
  readonly onAddColumn: (label: string) => void;
  readonly onRenameColumn: (index: number, label: string) => void;
  readonly onDeleteColumn: (index: number) => void;
  readonly onMoveColumn: (from: number, to: number) => void;
}

export function SpreadsheetColumnManager({
  gridState,
  onAddColumn,
  onRenameColumn,
  onDeleteColumn,
  onMoveColumn,
}: SpreadsheetColumnManagerProps) {
  const { t } = useTranslation('artifacts');
  const { confirm } = useConfirmation();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDelete = (index: number) => {
    if (!columnHasData(gridState, index)) {
      onDeleteColumn(index);
      return;
    }
    confirm({
      title: t('spreadsheet.toolbar.deleteColumnTitle'),
      description: t('spreadsheet.toolbar.deleteColumnDescription', {
        label: gridState.columns[index],
      }),
      confirmText: t('spreadsheet.toolbar.deleteColumnConfirm'),
      cancelText: t('spreadsheet.toolbar.deleteColumnCancel'),
      variant: 'destructive',
      onConfirm: () => onDeleteColumn(index),
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const move = resolveColumnReorder(
      String(event.active.id),
      event.over ? String(event.over.id) : undefined,
    );
    if (move) {
      onMoveColumn(move.from, move.to);
    }
  };

  const isColumnLimitReached =
    gridState.columns.length >= MAX_SPREADSHEET_COLUMNS;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs">
          <Columns3 className="mr-1 size-3.5" />
          {t('spreadsheet.toolbar.columns')}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={gridState.columns.map((_, index) => getColumnDragId(index))}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-1.5">
              {gridState.columns.map((label, index) => (
                <SpreadsheetColumnRow
                  key={getColumnDragId(index)}
                  label={label}
                  index={index}
                  onRename={onRenameColumn}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <Button
          variant="ghost"
          size="sm"
          className="mt-1.5 h-7 w-full justify-start text-xs"
          disabled={isColumnLimitReached}
          title={
            isColumnLimitReached
              ? t('spreadsheet.toolbar.maxColumnsReached', {
                  count: MAX_SPREADSHEET_COLUMNS,
                })
              : undefined
          }
          onClick={() =>
            onAddColumn(
              t('spreadsheet.toolbar.newColumnLabel', {
                number: gridState.columns.length + 1,
              }),
            )
          }
        >
          <Plus className="mr-1 size-3.5" />
          {t('spreadsheet.toolbar.addColumn')}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
