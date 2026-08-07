import { ListPlus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import { Input } from '@ayunis/ui/components/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@ayunis/ui/components/popover';
import {
  MAX_SPREADSHEET_ROWS,
  type GridState,
} from '../model/spreadsheet-grid-state';
import { SpreadsheetColumnManager } from './SpreadsheetColumnManager';

interface SpreadsheetToolbarProps {
  readonly gridState: GridState;
  readonly onAddRows: (count: number) => void;
  readonly onAddColumn: (label: string) => void;
  readonly onRenameColumn: (index: number, label: string) => void;
  readonly onDeleteColumn: (index: number) => void;
  readonly onMoveColumn: (from: number, to: number) => void;
}

export function SpreadsheetToolbar({
  gridState,
  onAddRows,
  onAddColumn,
  onRenameColumn,
  onDeleteColumn,
  onMoveColumn,
}: SpreadsheetToolbarProps) {
  const { t } = useTranslation('artifacts');
  const [addRowsOpen, setAddRowsOpen] = useState(false);
  const [rowCount, setRowCount] = useState('1');
  const remainingRows = Math.max(
    0,
    MAX_SPREADSHEET_ROWS - gridState.rows.length,
  );
  const isRowLimitReached = remainingRows === 0;
  const maxRowsPerBatch = Math.min(100, remainingRows);

  const handleAddRows = () => {
    if (isRowLimitReached) {
      return;
    }

    const parsed = Math.trunc(Number(rowCount));
    const count = Math.min(
      maxRowsPerBatch,
      Math.max(1, Number.isNaN(parsed) ? 1 : parsed),
    );
    onAddRows(count);
    setAddRowsOpen(false);
  };

  return (
    <div className="flex items-center gap-1 border-b px-3 py-1.5">
      <Popover open={addRowsOpen} onOpenChange={setAddRowsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            disabled={isRowLimitReached}
            title={
              isRowLimitReached
                ? t('spreadsheet.toolbar.maxRowsReached', {
                    count: MAX_SPREADSHEET_ROWS,
                  })
                : undefined
            }
          >
            <ListPlus className="mr-1 size-3.5" />
            {t('spreadsheet.toolbar.addRows')}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-2">
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={1}
              max={Math.max(1, maxRowsPerBatch)}
              value={rowCount}
              autoFocus
              disabled={isRowLimitReached}
              aria-label={t('spreadsheet.toolbar.addRowsCount')}
              className="h-7 text-xs"
              onChange={(e) => setRowCount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddRows();
                }
              }}
            />
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={isRowLimitReached}
              onClick={handleAddRows}
            >
              {t('spreadsheet.toolbar.addRowsConfirm')}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <SpreadsheetColumnManager
        gridState={gridState}
        onAddColumn={onAddColumn}
        onRenameColumn={onRenameColumn}
        onDeleteColumn={onDeleteColumn}
        onMoveColumn={onMoveColumn}
      />
    </div>
  );
}
