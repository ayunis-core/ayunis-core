import * as React from 'react';
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from 'lucide-react';

import { cn } from '@/shared/lib/shadcn/utils';

/* eslint-disable sonarjs/no-nested-conditional */

function Table({
  className,
  ...props
}: React.ComponentProps<'table'>): React.ReactElement {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({
  className,
  ...props
}: React.ComponentProps<'thead'>): React.ReactElement {
  return (
    <thead
      data-slot="table-header"
      className={cn('[&_tr]:border-b', className)}
      {...props}
    />
  );
}

function TableBody({
  className,
  ...props
}: React.ComponentProps<'tbody'>): React.ReactElement {
  return (
    <tbody
      data-slot="table-body"
      className={cn(
        '[&_tr:last-child]:border-0 [&>tr]:hover:bg-muted/50',
        className,
      )}
      {...props}
    />
  );
}

function TableFooter({
  className,
  ...props
}: React.ComponentProps<'tfoot'>): React.ReactElement {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        'bg-muted/50 border-t font-medium [&>tr]:last:border-b-0',
        className,
      )}
      {...props}
    />
  );
}

function TableRow({
  className,
  onClick,
  onKeyDown,
  ...props
}: React.ComponentProps<'tr'>): React.ReactElement {
  const isClickable = !!onClick;

  const handleKeyDown = isClickable
    ? (e: React.KeyboardEvent<HTMLTableRowElement>) => {
        if (
          e.target === e.currentTarget &&
          (e.key === 'Enter' || e.key === ' ')
        ) {
          e.preventDefault();
          e.currentTarget.click();
        }

        onKeyDown?.(e);
      }
    : onKeyDown;

  return (
    <tr
      data-slot="table-row"
      className={cn(
        'data-[state=selected]:bg-muted border-b transition-colors',
        isClickable &&
          'cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none',
        className,
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      {...(isClickable && { tabIndex: 0 })}
      {...props}
    />
  );
}

function TableHead({
  className,
  sortable,
  sortDirection,
  onSort,
  align,
  children,
  ...props
}: React.ComponentProps<'th'> & {
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc';
  onSort?: () => void;
  align?: 'left' | 'center' | 'right';
}): React.ReactElement {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            'hover:bg-accent flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 -ml-2 text-sm font-medium transition-colors',
            align === 'right' && 'ml-auto -mr-2',
            align === 'center' && 'mx-auto',
          )}
        >
          {children}
          {sortDirection === 'asc' ? (
            <ArrowUpIcon className="size-4 shrink-0" />
          ) : sortDirection === 'desc' ? (
            <ArrowDownIcon className="size-4 shrink-0" />
          ) : (
            <ArrowUpDownIcon className="size-4 shrink-0" />
          )}
        </button>
      ) : (
        children
      )}
    </th>
  );
}

function TableCell({
  className,
  ...props
}: React.ComponentProps<'td'>): React.ReactElement {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<'caption'>): React.ReactElement {
  return (
    <caption
      data-slot="table-caption"
      className={cn('text-muted-foreground mt-4 text-sm', className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
