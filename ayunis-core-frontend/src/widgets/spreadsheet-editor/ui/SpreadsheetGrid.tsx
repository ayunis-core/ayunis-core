import { useEffect, useMemo, useRef, useState } from 'react';
import { RevoGrid, Template } from '@revolist/react-datagrid';
import type {
  AfterEditEvent,
  BeforeColumnDragEndEventData,
  BeforeSaveDataDetails,
  CellTemplateProp,
  ColumnRegular,
} from '@revolist/react-datagrid';
import { useTranslation } from 'react-i18next';
import { Empty, EmptyDescription } from '@/shared/ui/shadcn/empty';
import './spreadsheet-grid.css';
import type { RowOperation } from '../model/spreadsheet-grid-operations';
import {
  isFormulaValue,
  isSpreadsheetErrorValue,
} from '../model/formula-values';
import type { GridRow } from '../model/spreadsheet-grid-state';
import { columnKey } from '../model/spreadsheet-grid-state';

const DISPLAY_VALUES_KEY = Symbol('spreadsheetDisplayValues');

interface GridSourceRow extends GridRow {
  [DISPLAY_VALUES_KEY]: string[];
}

/**
 * Read view of a cell: computed value for formula cells (raw text otherwise);
 * the editor keeps showing the raw formula because it edits the model value.
 */
function FormulaCell(props: Readonly<CellTemplateProp>) {
  const model = props.model as GridSourceRow;
  const raw = model[props.prop] as string | null | undefined;
  if (!isFormulaValue(raw)) {
    return <span>{raw}</span>;
  }
  const display = model[DISPLAY_VALUES_KEY][props.colIndex];
  return (
    <span
      className={
        isSpreadsheetErrorValue(display)
          ? 'rv-cell-formula rv-cell-formula-error'
          : 'rv-cell-formula'
      }
    >
      {display}
    </span>
  );
}

function normalizeCellValue(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.trim() ? value : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

// Single edits carry `prop`; range edits carry a rowIndex->model map instead.
function isSingleEdit(detail: AfterEditEvent): detail is BeforeSaveDataDetails {
  return 'prop' in detail;
}

function cloneRows(
  rows: GridRow[],
  displayValues: string[][],
): GridSourceRow[] {
  return rows.map((row, rowIndex) => ({
    ...row,
    [DISPLAY_VALUES_KEY]: displayValues[rowIndex] ?? [],
  }));
}

function updateSourceRows(
  source: GridSourceRow[],
  rows: GridRow[],
  displayValues: string[][],
): boolean {
  if (source.length !== rows.length) {
    return false;
  }

  rows.forEach((row, rowIndex) => {
    const sourceRow = source[rowIndex];
    for (const key of Object.keys(sourceRow)) {
      if (!(key in row)) {
        delete sourceRow[key];
      }
    }
    Object.assign(sourceRow, row, {
      [DISPLAY_VALUES_KEY]: displayValues[rowIndex] ?? [],
    });
  });

  return true;
}

function applyCellEdits(row: GridRow, edits: Partial<GridRow>): void {
  for (const [prop, value] of Object.entries(edits)) {
    row[prop] = normalizeCellValue(value);
  }
}

function applyEditToSourceRows(
  source: GridRow[],
  detail: AfterEditEvent,
): void {
  if (isSingleEdit(detail)) {
    const sourceRow = source.at(detail.rowIndex);
    if (sourceRow !== undefined) {
      applyCellEdits(sourceRow, {
        [String(detail.prop)]: normalizeCellValue(detail.val as unknown),
      });
    }
    return;
  }

  const edits = detail.data as Partial<Record<number, Partial<GridRow>>>;
  for (const [rowIndex, edit] of Object.entries(edits)) {
    const sourceRow = source.at(Number(rowIndex));
    if (sourceRow !== undefined && edit !== undefined) {
      applyCellEdits(sourceRow, edit);
    }
  }
}

function updateRows(rows: GridRow[], detail: AfterEditEvent): GridRow[] {
  if (isSingleEdit(detail)) {
    return rows.map((row, rowIndex) =>
      rowIndex === detail.rowIndex
        ? {
            ...row,
            [String(detail.prop)]: normalizeCellValue(detail.val),
          }
        : row,
    );
  }

  const edits = detail.data as Partial<Record<number, Partial<GridRow>>>;
  return rows.map((row, rowIndex) => {
    const edit = edits[rowIndex];
    if (edit === undefined) {
      return row;
    }
    const merged = { ...row };
    applyCellEdits(merged, edit);
    return merged;
  });
}

interface SpreadsheetGridProps {
  readonly columns: string[];
  readonly rows: GridRow[];
  readonly displayValues: string[][];
  readonly onRowsChange: (
    update: (rows: GridRow[]) => GridRow[],
    operations: RowOperation[],
  ) => void;
  readonly onMoveColumn: (from: number, to: number) => void;
  readonly readOnly?: boolean;
}

export function SpreadsheetGrid({
  columns,
  rows,
  displayValues,
  onRowsChange,
  onMoveColumn,
  readOnly,
}: SpreadsheetGridProps) {
  const { t } = useTranslation('artifacts');
  const gridRef = useRef<HTMLRevoGridElement>(null);
  const moveColumnRef = useRef(onMoveColumn);
  const [source, setSource] = useState(() => cloneRows(rows, displayValues));
  const sourceRef = useRef(source);
  const initialRowsRef = useRef(rows);
  const initialColumnsRef = useRef(columns);
  const initialDisplayValuesRef = useRef(displayValues);
  const skipSourceSyncRef = useRef(false);
  useEffect(() => {
    moveColumnRef.current = onMoveColumn;
  });

  useEffect(() => {
    if (
      rows === initialRowsRef.current &&
      columns === initialColumnsRef.current &&
      displayValues === initialDisplayValuesRef.current
    ) {
      return;
    }

    if (skipSourceSyncRef.current) {
      skipSourceSyncRef.current = false;
      if (updateSourceRows(sourceRef.current, rows, displayValues)) {
        return;
      }
    }

    const nextSource = cloneRows(rows, displayValues);
    sourceRef.current = nextSource;
    setSource(nextSource);
  }, [columns, displayValues, rows]);

  const isDark = document.documentElement.classList.contains('dark');
  const isEmpty = columns.length === 0;
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  // Header drag-and-drop: cancel RevoGrid's internal reorder and route the
  // move through the model instead — column order changes rewrite formula
  // references, so the model must stay the single source of truth.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) {
      return;
    }
    const handleDragEnd = (
      event: CustomEvent<BeforeColumnDragEndEventData>,
    ) => {
      event.preventDefault();
      const from = event.detail.startPosition.itemIndex;
      const to = event.detail.newPosition.itemIndex;
      if (from !== to) {
        moveColumnRef.current(from, to);
      }
    };
    grid.addEventListener('beforecolumndragend', handleDragEnd);
    return () => grid.removeEventListener('beforecolumndragend', handleDragEnd);
  }, [isEmpty]);

  const gridColumns = useMemo<ColumnRegular[]>(
    () =>
      columns.map((label, index) => ({
        prop: columnKey(index),
        name: label,
        size: columnWidths[columnKey(index)] ?? 160,
        minSize: 60,
        cellTemplate: Template(FormulaCell as Parameters<typeof Template>[0]),
      })),
    [columns, columnWidths],
  );

  const handleAfterEdit = (event: CustomEvent<AfterEditEvent>) => {
    if (readOnly) {
      return;
    }

    const detail = event.detail;
    skipSourceSyncRef.current = true;
    applyEditToSourceRows(sourceRef.current, detail);
    onRowsChange(
      (currentRows) => updateRows(currentRows, detail),
      [{ type: 'UPDATE', fromRowIndex: 0, toRowIndex: rows.length }],
    );
  };

  if (isEmpty) {
    return (
      <Empty className="h-full min-h-0 gap-0 rounded-none p-4">
        <EmptyDescription>{t('spreadsheet.empty')}</EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="h-full">
      <RevoGrid
        ref={gridRef}
        className="rv-spreadsheet"
        style={{ height: '100%' }}
        source={source}
        columns={gridColumns}
        theme={isDark ? 'darkCompact' : 'compact'}
        resize
        range
        hideAttribution
        readonly={readOnly}
        canMoveColumns={readOnly !== true}
        // Row numbers match formula/export coordinates: headers are sheet
        // row 1, so the first data row is 2.
        rowHeaders={{
          prop: 'rowNumber',
          size: 44,
          cellTemplate: (_header, props) => String(props.rowIndex + 2),
        }}
        onAfteredit={handleAfterEdit}
        onAftercolumnresize={(event) => {
          setColumnWidths((previous) => {
            const next = { ...previous };
            for (const [index, column] of Object.entries(event.detail)) {
              if (typeof column.size === 'number') {
                next[columnKey(Number(index))] = column.size;
              }
            }
            return next;
          });
        }}
      />
    </div>
  );
}
