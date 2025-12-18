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

interface ChatsPaginationProps {
  currentPage: number;
  totalPages: number;
  search?: string;
  agentId?: string;
}

export default function ChatsPagination({
  currentPage,
  totalPages,
  search,
  agentId,
}: ChatsPaginationProps) {
  const { t } = useTranslation('common');

  if (totalPages <= 1) {
    return null;
  }

  const getPageNumbers = () => {
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
  };

  const searchParams = {
    ...(search && { search }),
    ...(agentId && { agentId }),
  };

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  return (
    <Pagination className="mt-6">
      <PaginationContent>
        <PaginationItem>
          <Link
            to="/chats"
            search={{ ...searchParams, page: currentPage - 1 }}
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
        {getPageNumbers().map((pageNum, idx) =>
          pageNum === 'ellipsis' ? (
            <PaginationItem key={`ellipsis-${idx}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={pageNum}>
              <Link
                to="/chats"
                search={{ ...searchParams, page: pageNum }}
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
            to="/chats"
            search={{ ...searchParams, page: currentPage + 1 }}
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
