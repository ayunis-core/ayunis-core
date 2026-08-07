import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AfterEditEvent } from '@revolist/react-datagrid';
import type { GridRow } from '../model/spreadsheet-grid-state';
import { SpreadsheetGrid } from './SpreadsheetGrid';

const gridMock = vi.hoisted(() => ({
  props: undefined as
    | {
        source: unknown[];
        onAfteredit: (event: CustomEvent<AfterEditEvent>) => void;
      }
    | undefined,
}));

vi.mock('@revolist/react-datagrid', () => ({
  RevoGrid: (props: typeof gridMock.props) => {
    gridMock.props = props;
    return <div data-testid="revo-grid" />;
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('SpreadsheetGrid', () => {
  beforeEach(() => {
    gridMock.props = undefined;
  });

  it('keeps the RevoGrid source stable after a cell edit', () => {
    let currentRows: GridRow[] = [{ c0: 'before' }];
    const onMoveColumn = vi.fn();
    const rendered = render(
      <SpreadsheetGrid
        columns={['Value']}
        rows={currentRows}
        onRowsChange={(update) => {
          currentRows = update(currentRows);
          rendered.rerender(
            <SpreadsheetGrid
              columns={['Value']}
              rows={currentRows}
              onRowsChange={(nextUpdate) => {
                currentRows = nextUpdate(currentRows);
              }}
              onMoveColumn={onMoveColumn}
            />,
          );
        }}
        onMoveColumn={onMoveColumn}
      />,
    );
    const initialSource = gridMock.props?.source;

    act(() => {
      gridMock.props?.onAfteredit({
        detail: { prop: 'c0', rowIndex: 0, val: 'after' },
      } as CustomEvent<AfterEditEvent>);
    });

    expect(gridMock.props?.source).toBe(initialSource);
    expect(currentRows).toEqual([{ c0: 'after' }]);
  });

  it('refreshes the source after an ignored read-only edit', () => {
    const historyRows: GridRow[] = [{ c0: 'history' }];
    const currentRows: GridRow[] = [{ c0: 'current' }];
    const rendered = render(
      <SpreadsheetGrid
        columns={['Value']}
        rows={historyRows}
        onRowsChange={vi.fn()}
        onMoveColumn={vi.fn()}
        readOnly
      />,
    );

    act(() => {
      gridMock.props?.onAfteredit({
        detail: { prop: 'c0', rowIndex: 0, val: 'ignored' },
      } as CustomEvent<AfterEditEvent>);
    });

    rendered.rerender(
      <SpreadsheetGrid
        columns={['Value']}
        rows={currentRows}
        onRowsChange={vi.fn()}
        onMoveColumn={vi.fn()}
      />,
    );

    expect(gridMock.props?.source).toEqual(currentRows);
  });
});
