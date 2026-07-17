import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { CellProps, Column } from 'react-datasheet-grid';
// DynamicDataSheetGrid, not DataSheetGrid: the default export freezes the
// columns prop on first render, and our columns carry per-render display
// values for formula cells.
import { DynamicDataSheetGrid, keyColumn } from 'react-datasheet-grid';
import { useTranslation } from 'react-i18next';
import 'react-datasheet-grid/dist/style.css';
import './spreadsheet-grid.css';
import type { GridRow, RowOperation } from '../model/spreadsheet-content';
import { columnKey, isFormulaValue } from '../model/spreadsheet-content';

interface FormulaColumnData {
  getDisplay: (rowIndex: number) => string;
}

type CellValue = string | null;

/**
 * Text cell that shows the computed value of formula cells when blurred and
 * the raw formula while editing (Excel behavior). Modeled on the library's
 * TextComponent, simplified to continuous updates.
 */
const FormulaCellInput = memo(
  ({
    focus,
    rowData,
    setRowData,
    rowIndex,
    columnData,
  }: CellProps<CellValue, FormulaColumnData>) => {
    const ref = useRef<HTMLInputElement>(null);
    const prevFocus = useRef(false);

    useLayoutEffect(() => {
      const input = ref.current;
      if (!input) {
        return;
      }
      if (focus && !prevFocus.current) {
        input.value = rowData ?? '';
        input.focus();
        input.select();
      } else if (!focus && prevFocus.current) {
        input.blur();
      }
      prevFocus.current = focus;
    }, [focus, rowData]);

    const display = columnData.getDisplay(rowIndex);
    useEffect(() => {
      if (!focus && ref.current) {
        ref.current.value = display;
      }
    }, [focus, display]);

    return (
      <input
        className="dsg-input"
        ref={ref}
        style={{ pointerEvents: focus ? 'auto' : 'none' }}
        onChange={(e) =>
          setRowData(e.target.value.trim() ? e.target.value : null)
        }
      />
    );
  },
);
FormulaCellInput.displayName = 'FormulaCellInput';

function formulaTextColumn(
  columnData: FormulaColumnData,
): Partial<Column<CellValue, FormulaColumnData, string>> {
  return {
    component: FormulaCellInput,
    columnData,
    deleteValue: () => null,
    copyValue: ({ rowData }) => rowData ?? '',
    pasteValue: ({ value }) => value.replaceAll(/[\n\r]+/g, ' ').trim() || null,
    isCellEmpty: ({ rowData }) => rowData === null,
  };
}

interface SpreadsheetGridProps {
  readonly columns: string[];
  readonly rows: GridRow[];
  readonly displayValues: string[][];
  readonly onRowsChange: (rows: GridRow[], operations: RowOperation[]) => void;
  readonly readOnly?: boolean;
}

export function SpreadsheetGrid({
  columns,
  rows,
  displayValues,
  onRowsChange,
  readOnly,
}: SpreadsheetGridProps) {
  const { t } = useTranslation('artifacts');

  const gridColumns = useMemo<Column<GridRow>[]>(
    () =>
      columns.map((label, index) => {
        const key = columnKey(index);
        return {
          ...keyColumn(
            key,
            formulaTextColumn({
              getDisplay: (rowIndex) => displayValues[rowIndex]?.[index] ?? '',
            }),
          ),
          title: label,
          disabled: readOnly === true,
          cellClassName: ({
            rowData,
            rowIndex,
          }: {
            rowData: GridRow;
            rowIndex: number;
          }) => {
            if (!isFormulaValue(rowData[key])) {
              return undefined;
            }
            const display = displayValues[rowIndex]?.[index] ?? '';
            return display.startsWith('#')
              ? 'dsg-cell-formula dsg-cell-formula-error'
              : 'dsg-cell-formula';
          },
        };
      }),
    [columns, readOnly, displayValues],
  );

  if (columns.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center p-4 text-sm">
        {t('spreadsheet.empty')}
      </div>
    );
  }

  return (
    <DynamicDataSheetGrid
      value={rows}
      onChange={onRowsChange}
      columns={gridColumns}
      // Gutter numbers match formula/export coordinates: headers are sheet
      // row 1, so the first data row is 2.
      gutterColumn={{ component: GutterCell, title: '1' }}
      createRow={() => ({})}
      lockRows={readOnly}
    />
  );
}

function GutterCell({ rowIndex }: { readonly rowIndex: number }) {
  return <>{rowIndex + 2}</>;
}
