import type { ComponentProps } from 'react';
import { TableHead } from '@ayunis/ui/components/table';
import { nextSort, type TableSort } from '@/shared/lib/table-sort';

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

type SortableTableHeadProps<Field extends string> = Omit<
  ComponentProps<typeof TableHead>,
  'sortable' | 'sortDirection' | 'onSort'
> & {
  field: Field;
  sort: TableSort<Field>;
  onSort: (next: Required<TableSort<Field>>) => void;
};

export function SortableTableHead<Field extends string>({
  field,
  sort,
  onSort,
  ...props
}: Readonly<SortableTableHeadProps<Field>>) {
  const direction = sort.sortBy === field ? sort.sortOrder : undefined;
  return (
    <TableHead
      {...props}
      sortable
      sortDirection={direction}
      aria-sort={direction ? ARIA_SORT[direction] : 'none'}
      onSort={() => onSort(nextSort(sort, field))}
    />
  );
}
