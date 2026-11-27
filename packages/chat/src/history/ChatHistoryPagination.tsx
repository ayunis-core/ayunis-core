import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from '@ayunis/ui/components/pagination';

function pageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  for (
    let page = Math.max(2, current - 1);
    page <= Math.min(total - 1, current + 1);
    page += 1
  ) {
    pages.push(page);
  }
  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

export function ChatHistoryPagination({
  currentPage,
  totalPages,
  onPage,
}: Readonly<{
  currentPage: number;
  totalPages: number;
  onPage: (page: number) => void;
}>) {
  if (totalPages <= 1) return null;
  return (
    <Pagination className="mt-6">
      <PaginationContent>
        <PageControl
          direction="previous"
          disabled={currentPage === 1}
          onClick={() => onPage(currentPage - 1)}
        />
        {pageNumbers(currentPage, totalPages).map((page, index) =>
          page === 'ellipsis' ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <PageButton
                current={page === currentPage}
                onClick={() => onPage(page)}
              >
                {page}
              </PageButton>
            </PaginationItem>
          ),
        )}
        <PageControl
          direction="next"
          disabled={currentPage === totalPages}
          onClick={() => onPage(currentPage + 1)}
        />
      </PaginationContent>
    </Pagination>
  );
}

function PageButton({
  current,
  onClick,
  children,
}: Readonly<{ current: boolean; onClick: () => void; children: ReactNode }>) {
  return (
    <Button
      type="button"
      variant={current ? 'outline' : 'ghost'}
      size="icon"
      aria-current={current ? 'page' : undefined}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function PageControl({
  direction,
  disabled,
  onClick,
}: Readonly<{
  direction: 'previous' | 'next';
  disabled: boolean;
  onClick: () => void;
}>) {
  const { t } = useTranslation('common');
  const previous = direction === 'previous';
  return (
    <PaginationItem>
      <Button
        type="button"
        variant="ghost"
        className={
          previous ? 'gap-1 px-2.5 sm:pl-2.5' : 'gap-1 px-2.5 sm:pr-2.5'
        }
        disabled={disabled}
        aria-label={previous ? 'Go to previous page' : 'Go to next page'}
        data-testid={`chat-history-${direction}`}
        onClick={onClick}
      >
        {previous && <ChevronLeft />}
        <span className="hidden sm:block">
          {t(`common.pagination.${direction}`)}
        </span>
        {!previous && <ChevronRight />}
      </Button>
    </PaginationItem>
  );
}
