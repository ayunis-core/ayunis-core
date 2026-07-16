import { Columns3, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/shadcn/popover';
import { useConfirmation } from '@/widgets/confirmation-modal';
import type { GridState } from '../model/spreadsheet-content';
import { columnHasData } from '../model/spreadsheet-content';

interface SpreadsheetToolbarProps {
  readonly gridState: GridState;
  readonly onAddColumn: (label: string) => void;
  readonly onRenameColumn: (index: number, label: string) => void;
  readonly onDeleteColumn: (index: number) => void;
}

export function SpreadsheetToolbar({
  gridState,
  onAddColumn,
  onRenameColumn,
  onDeleteColumn,
}: SpreadsheetToolbarProps) {
  const { t } = useTranslation('artifacts');
  const { confirm } = useConfirmation();

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

  return (
    <div className="flex items-center gap-1 border-b px-3 py-1.5">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
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

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            <Columns3 className="mr-1 size-3.5" />
            {t('spreadsheet.toolbar.columns')}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-2">
          <div className="flex flex-col gap-1.5">
            {gridState.columns.map((label, index) => (
              // Index keys are safe: columns have no stable id and no reordering
              <div key={index} className="flex items-center gap-1.5">
                <Input
                  className="h-7 text-xs"
                  value={label}
                  onChange={(e) => onRenameColumn(index, e.target.value)}
                  aria-label={t('spreadsheet.toolbar.renameColumn', {
                    number: index + 1,
                  })}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 shrink-0 p-0"
                  onClick={() => handleDelete(index)}
                  title={t('spreadsheet.toolbar.deleteColumn')}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
            {gridState.columns.length === 0 && (
              <span className="text-muted-foreground px-1 text-xs">
                {t('spreadsheet.toolbar.noColumns')}
              </span>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
