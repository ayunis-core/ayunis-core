import * as React from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from 'lucide-react';

import { cn } from '@/shared/lib/shadcn/utils';
import { buttonVariants, type Button } from '@/shared/ui/shadcn/button';

function Pagination({
  className,
  ...props
}: React.ComponentProps<'nav'>): React.ReactElement {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  );
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<'ul'>): React.ReactElement {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex flex-row items-center gap-1', className)}
      {...props}
    />
  );
}

function PaginationItem({
  ...props
}: React.ComponentProps<'li'>): React.ReactElement {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, 'size'> &
  React.ComponentProps<'a'>;

function PaginationLink({
  className,
  isActive,
  size = 'icon',
  ...props
}: PaginationLinkProps): React.ReactElement {
  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? 'outline' : 'ghost',
          size,
        }),
        className,
      )}
      {...props}
    />
  );
}

type PaginationPreviousProps = React.ComponentProps<typeof PaginationLink> & {
  label?: string;
  ariaLabel?: string;
};

function PaginationPrevious({
  className,
  label = 'Previous',
  ariaLabel = 'Go to previous page',
  ...props
}: PaginationPreviousProps): React.ReactElement {
  return (
    <PaginationLink
      aria-label={ariaLabel}
      size="default"
      className={cn('gap-1 px-2.5 sm:pl-2.5', className)}
      {...props}
    >
      <ChevronLeftIcon />
      <span className="hidden sm:block">{label}</span>
    </PaginationLink>
  );
}

type PaginationNextProps = React.ComponentProps<typeof PaginationLink> & {
  label?: string;
  ariaLabel?: string;
};

function PaginationNext({
  className,
  label = 'Next',
  ariaLabel = 'Go to next page',
  ...props
}: PaginationNextProps): React.ReactElement {
  return (
    <PaginationLink
      aria-label={ariaLabel}
      size="default"
      className={cn('gap-1 px-2.5 sm:pr-2.5', className)}
      {...props}
    >
      <span className="hidden sm:block">{label}</span>
      <ChevronRightIcon />
    </PaginationLink>
  );
}

type PaginationEllipsisProps = React.ComponentProps<'span'> & {
  srLabel?: string;
};

function PaginationEllipsis({
  className,
  srLabel = 'More pages',
  ...props
}: PaginationEllipsisProps): React.ReactElement {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn('flex size-9 items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">{srLabel}</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};

export type {
  PaginationLinkProps,
  PaginationPreviousProps,
  PaginationNextProps,
  PaginationEllipsisProps,
};
