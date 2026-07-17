import { useMemo } from 'react';
import type { Column } from 'react-datasheet-grid';
import { DataSheetGrid, keyColumn, textColumn } from 'react-datasheet-grid';
import { useTranslation } from 'react-i18next';
import 'react-datasheet-grid/dist/style.css';
import './spreadsheet-grid.css';
import type { GridRow } from '../model/spreadsheet-content';
import { columnKey, isFormulaValue } from '../model/spreadsheet-content';

interface SpreadsheetGridProps {
  readonly columns: string[];
  readonly rows: GridRow[];
  readonly onRowsChange: (rows: GridRow[]) => void;
  readonly readOnly?: boolean;
}

export function SpreadsheetGrid({
  columns,
  rows,
  onRowsChange,
  readOnly,
}: SpreadsheetGridProps) {
  const { t } = useTranslation('artifacts');

  const gridColumns = useMemo<Column<GridRow>[]>(
    () =>
      columns.map((label, index) => {
        const key = columnKey(index);
        return {
          ...keyColumn(key, textColumn),
          title: label,
          disabled: readOnly === true,
          cellClassName: ({ rowData }: { rowData: GridRow }) =>
            isFormulaValue(rowData[key]) ? 'dsg-cell-formula' : undefined,
        };
      }),
    [columns, readOnly],
  );

  if (columns.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center p-4 text-sm">
        {t('spreadsheet.empty')}
      </div>
    );
  }

  return (
    <DataSheetGrid
      value={rows}
      onChange={onRowsChange}
      columns={gridColumns}
      createRow={() => ({})}
      lockRows={readOnly}
    />
  );
}
