import { useTranslation } from 'react-i18next';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
  PaginationLink,
} from '@/shared/ui/shadcn/pagination';
import { getPageNumbers } from '../lib/getPageNumbers';

interface UserUsageTablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function UserUsageTablePagination({
  currentPage,
  totalPages,
  onPageChange,
}: Readonly<UserUsageTablePaginationProps>) {
  const { t: tCommon } = useTranslation('common');
  const pageNumbers = getPageNumbers(totalPages, currentPage);

  return (
    <div className="flex justify-center mt-6">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage > 0) onPageChange(currentPage - 1);
              }}
              className={
                currentPage === 0 ? 'pointer-events-none opacity-50' : ''
              }
              label={tCommon('common.pagination.previous')}
            />
          </PaginationItem>
          {pageNumbers.map((page, index) => {
            if (page === 'ellipsis') {
              return (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }
            const pageIndex = page - 1;
            return (
              <PaginationItem key={page}>
                <PaginationLink
                  href="#"
                  isActive={pageIndex === currentPage}
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange(pageIndex);
                  }}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            );
          })}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage < totalPages - 1) onPageChange(currentPage + 1);
              }}
              className={
                currentPage >= totalPages - 1
                  ? 'pointer-events-none opacity-50'
                  : ''
              }
              label={tCommon('common.pagination.next')}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
