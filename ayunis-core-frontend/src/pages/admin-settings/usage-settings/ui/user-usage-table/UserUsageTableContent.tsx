// Types
import type { UserUsageDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

// Utils
import { formatDistanceToNow } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

// UI
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/shadcn/table';
import { Badge } from '@/shared/ui/shadcn/badge';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
  PaginationLink,
} from '@/shared/ui/shadcn/pagination';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/shared/ui/shadcn/card';

// Lib
import { formatCompactNumber } from '@/shared/lib/formatCompactNumber';

interface UserUsageTableContentProps {
  users: UserUsageDto[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function UserUsageTableContent({
  users,
  currentPage,
  totalPages,
  onPageChange,
}: UserUsageTableContentProps) {
  const { t, i18n } = useTranslation('admin-settings-usage');
  const { t: tCommon } = useTranslation('common');

  const formatCompact = (value?: number) => {
    if (value === undefined) {
      return '-';
    }
    return formatCompactNumber(value, i18n.language);
  };

  const getPageNumbers = () => {
    const total = Math.max(totalPages ?? 0, 1);
    const current = currentPage + 1; // convert to 1-based
    const delta = 1; // how many pages around current to show

    // Always include first, last, and nearby pages
    const pages: (number | 'ellipsis')[] = [];
    const range = [];

    for (
      let i = Math.max(2, current - delta);
      i <= Math.min(total - 1, current + delta);
      i++
    ) {
      range.push(i);
    }

    const showLeftEllipsis = range[0] > 2;
    const showRightEllipsis = range[range.length - 1] < total - 1;

    pages.push(1);
    if (showLeftEllipsis) {
      pages.push('ellipsis');
    }

    pages.push(...range);
    if (showRightEllipsis) {
      pages.push('ellipsis');
    }

    if (total > 1) {
      pages.push(total);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('userUsage.title')}</CardTitle>
        <CardDescription>{t('userUsage.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table className="w-[750px]">
          <TableHeader>
            <TableRow className="border-border/40">
              <TableHead>{t('userUsage.user')}</TableHead>
              <TableHead>{t('userUsage.tokens')}</TableHead>
              <TableHead>{t('userUsage.requests')}</TableHead>
              <TableHead>{t('userUsage.lastActive')}</TableHead>
              <TableHead>{t('userUsage.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length > 0 ? (
              users.map((user) => (
                <TableRow
                  key={user.userId}
                  className="border-border/20 transition hover:bg-muted/20"
                >
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.userName}</div>
                      <div className="text-sm text-muted-foreground">
                        {user.userEmail}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {formatCompact(user.tokens)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('userUsage.tokens')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {formatCompact(user.requests)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('userUsage.requests')}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.lastActivity ? (
                      <span className="text-sm">
                        {/* TODO: Fix typing issue on the dto level */}
                        {formatDistanceToNow(
                          new Date(user.lastActivity as unknown as string),
                          {
                            addSuffix: true,
                            locale: i18n.language === 'de' ? de : enUS,
                          },
                        )}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'secondary'}>
                      {user.isActive
                        ? t('userUsage.active')
                        : t('userUsage.inactive')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  {t('userUsage.emptyState')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
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
                const pageIndex = page - 1; // Convert to 0-based
                const isActive = pageIndex === currentPage;
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      isActive={isActive}
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
                    if (currentPage < totalPages - 1)
                      onPageChange(currentPage + 1);
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
      </CardContent>
    </Card>
  );
}
