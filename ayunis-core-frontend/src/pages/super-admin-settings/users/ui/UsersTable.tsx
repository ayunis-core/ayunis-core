import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ayunis/ui/components/table';
import { useTranslation } from 'react-i18next';
import { SuperAdminUserActions } from '@/widgets/super-admin-user-actions';
import type {
  PaginationDto,
  SuperAdminUserListItemResponseDto,
} from '@/shared/api';
import { UsersPagination } from './UsersPagination';
import { UsersSearch } from './UsersSearch';
import { UserLockStatus } from '@/widgets/user-lock-status';

interface UsersTableProps {
  users: SuperAdminUserListItemResponseDto[];
  pagination?: PaginationDto;
  search?: string;
  currentPage: number;
}

export function UsersTable({
  users,
  pagination,
  search,
  currentPage,
}: Readonly<UsersTableProps>) {
  const { t } = useTranslation('super-admin-settings-users');
  const total = pagination?.total ?? 0;
  const limit = pagination?.limit ?? 25;
  const totalPages = Math.ceil(total / limit);

  return (
    <Card data-testid="super-admin-users-table">
      <CardHeader>
        <CardTitle>
          {t('header.title')}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {t('header.total', { count: total })}
          </span>
        </CardTitle>
        <CardDescription>{t('header.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <UsersSearch search={search} />
        </div>
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-2 py-10 text-center">
            <h3 className="text-lg font-semibold">{t('empty.title')}</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              {t('empty.description')}
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.name')}</TableHead>
                  <TableHead>{t('table.email')}</TableHead>
                  <TableHead>{t('table.organization')}</TableHead>
                  <TableHead>{t('table.status')}</TableHead>
                  <TableHead className="w-[100px]">
                    {t('table.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user.id}
                    data-testid="super-admin-user-row"
                    data-user-id={user.id}
                  >
                    <TableCell
                      className="font-medium"
                      data-testid={`super-admin-user-id-${user.id}`}
                    >
                      {user.name}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.orgName}</TableCell>
                    <TableCell>
                      <UserLockStatus isLocked={user.isLocked} />
                    </TableCell>
                    <TableCell className="w-[100px]">
                      <SuperAdminUserActions user={user} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <UsersPagination
              currentPage={currentPage}
              totalPages={totalPages}
              search={search}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
