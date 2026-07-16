import { useEffect, useMemo, useRef, useState } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import type {
  AfterEditEvent,
  BeforeColumnDragEndEventData,
  BeforeSaveDataDetails,
  ColumnRegular,
} from '@revolist/react-datagrid';
import { useTranslation } from 'react-i18next';
import { Empty, EmptyDescription } from '@/shared/ui/shadcn/empty';
import './spreadsheet-grid.css';
import type { GridRow } from '../model/spreadsheet-grid-state';
import { columnKey } from '../model/spreadsheet-grid-state';

function normalizeCellValue(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.trim() ? value : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function isSingleEdit(detail: AfterEditEvent): detail is BeforeSaveDataDetails {
  return 'prop' in detail;
}

function cloneRows(rows: GridRow[]): GridRow[] {
  return rows.map((row) => ({ ...row }));
}

function applyCellEdits(row: GridRow, edits: Partial<GridRow>): void {
  for (const [prop, value] of Object.entries(edits)) {
    row[prop] = normalizeCellValue(value);
  }
}

function updateSourceRows(source: GridRow[], detail: AfterEditEvent): void {
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
  readonly onRowsChange: (update: (rows: GridRow[]) => GridRow[]) => void;
  readonly onMoveColumn: (from: number, to: number) => void;
  readonly readOnly?: boolean;
}

export function SpreadsheetGrid({
  columns,
  rows,
  onRowsChange,
  onMoveColumn,
  readOnly,
}: SpreadsheetGridProps) {
  const { t } = useTranslation('artifacts');
  const gridRef = useRef<HTMLRevoGridElement>(null);
  const moveColumnRef = useRef(onMoveColumn);
  const [source, setSource] = useState(() => cloneRows(rows));
  const sourceRef = useRef(source);
  const initialRowsRef = useRef(rows);
  const initialColumnsRef = useRef(columns);
  const skipSourceSyncRef = useRef(false);
  useEffect(() => {
    moveColumnRef.current = onMoveColumn;
  });

  useEffect(() => {
    if (
      rows === initialRowsRef.current &&
      columns === initialColumnsRef.current
    ) {
      return;
    }

    if (skipSourceSyncRef.current) {
      skipSourceSyncRef.current = false;
      return;
    }

    const nextSource = cloneRows(rows);
    sourceRef.current = nextSource;
    setSource(nextSource);
  }, [columns, rows]);

  const isDark = document.documentElement.classList.contains('dark');
  const isEmpty = columns.length === 0;

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
        size: 160,
        minSize: 60,
      })),
    [columns],
  );

  const handleAfterEdit = (event: CustomEvent<AfterEditEvent>) => {
    if (readOnly) {
      return;
    }

    const detail = event.detail;
    skipSourceSyncRef.current = true;
    updateSourceRows(sourceRef.current, detail);
    onRowsChange((currentRows) => updateRows(currentRows, detail));
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
        rowHeaders={{
          prop: 'rowNumber',
          size: 44,
          cellTemplate: (_header, props) => String(props.rowIndex + 2),
        }}
        onAfteredit={handleAfterEdit}
      />
    </div>
  );
}
