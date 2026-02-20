import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationEllipsis,
} from '@/shared/ui/shadcn/pagination';
import { buttonVariants } from '@/shared/ui/shadcn/button';
import { cn } from '@/shared/lib/shadcn/utils';

type SearchParamValue = string | number | boolean | undefined;
type SearchParamObject = Record<string, SearchParamValue>;
type SearchParamFn = (prev: SearchParamObject) => SearchParamObject;

interface PaginationWidgetProps {
  currentPage: number;
  totalPages: number;
  to: string;
  params?: Record<string, string>;
  buildSearchParams: (targetPage: number) => SearchParamObject | SearchParamFn;
}

function getPageNumbers(
  currentPage: number,
  totalPages: number,
): (number | 'ellipsis')[] {
  const pages: (number | 'ellipsis')[] = [];
  const showEllipsisStart = currentPage > 3;
  const showEllipsisEnd = currentPage < totalPages - 2;

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);
    if (showEllipsisStart) {
      pages.push('ellipsis');
    }
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (showEllipsisEnd) {
      pages.push('ellipsis');
    }
    pages.push(totalPages);
  }
  return pages;
}

export default function PaginationWidget({
  currentPage,
  totalPages,
  to,
  params,
  buildSearchParams,
}: Readonly<PaginationWidgetProps>) {
  const { t } = useTranslation('common');

  if (totalPages <= 1) {
    return null;
  }

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  const linkProps = {
    to,
    ...(params && { params }),
  };

  // TanStack Router's Link requires route-specific search types, but this
  // widget is route-agnostic. Callers provide correctly-typed search params
  // for their specific route. The assertion is safe because the search params
  // are validated at the call site.
  const searchFor = (targetPage: number) =>
    buildSearchParams(targetPage) as never;

  return (
    <Pagination className="mt-6">
      <PaginationContent>
        <PaginationItem>
          <Link
            {...linkProps}
            search={searchFor(currentPage - 1)}
            disabled={isFirstPage}
            aria-label="Go to previous page"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'default' }),
              'gap-1 px-2.5 sm:pl-2.5',
              isFirstPage && 'pointer-events-none opacity-50',
            )}
          >
            <ChevronLeftIcon />
            <span className="hidden sm:block">
              {t('common.pagination.previous')}
            </span>
          </Link>
        </PaginationItem>
        {getPageNumbers(currentPage, totalPages).map((pageNum, idx) =>
          pageNum === 'ellipsis' ? (
            <PaginationItem key={`ellipsis-${idx}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={pageNum}>
              <Link
                {...linkProps}
                search={searchFor(pageNum)}
                aria-current={pageNum === currentPage ? 'page' : undefined}
                className={cn(
                  buttonVariants({
                    variant: pageNum === currentPage ? 'outline' : 'ghost',
                    size: 'icon',
                  }),
                )}
              >
                {pageNum}
              </Link>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <Link
            {...linkProps}
            search={searchFor(currentPage + 1)}
            disabled={isLastPage}
            aria-label="Go to next page"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'default' }),
              'gap-1 px-2.5 sm:pr-2.5',
              isLastPage && 'pointer-events-none opacity-50',
            )}
          >
            <span className="hidden sm:block">
              {t('common.pagination.next')}
            </span>
            <ChevronRightIcon />
          </Link>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
