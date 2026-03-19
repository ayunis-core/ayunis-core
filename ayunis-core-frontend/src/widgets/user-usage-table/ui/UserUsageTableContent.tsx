import type { UserUsageDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/shadcn/table';
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/shared/ui/shadcn/card';
import { UserUsageTableRow } from './UserUsageTableRow';
import { UserUsageTablePagination } from './UserUsageTablePagination';

interface UserUsageTableContentProps {
  users: UserUsageDto[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  headerAction?: React.ReactNode;
  description?: React.ReactNode;
}

export function UserUsageTableContent({
  users,
  currentPage,
  totalPages,
  onPageChange,
  headerAction,
  description,
}: Readonly<UserUsageTableContentProps>) {
  const { t } = useTranslation('admin-settings-usage');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('userUsage.title')}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {headerAction && <CardAction>{headerAction}</CardAction>}
      </CardHeader>
      <CardContent>
        <Table className="w-[750px]">
          <TableHeader>
            <TableRow className="border-border/40">
              <TableHead>{t('userUsage.user')}</TableHead>
              <TableHead>{t('userUsage.credits')}</TableHead>
              <TableHead>{t('userUsage.requests')}</TableHead>
              <TableHead>{t('userUsage.lastActive')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length > 0 ? (
              users.map((user) => (
                <UserUsageTableRow key={user.userId} user={user} />
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-8 text-muted-foreground"
                >
                  {t('userUsage.emptyState')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <UserUsageTablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </CardContent>
    </Card>
  );
}
