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
import type {
  UserResponseDto,
  UserResponseDtoRole,
  PaginationDto,
} from '@/shared/api';
import { formatDate } from '@/shared/lib/format-date';
import CreateUserDialog from './CreateUserDialog';
import SuperAdminUsersSearch from './SuperAdminUsersSearch';
import SuperAdminUsersPagination from './SuperAdminUsersPagination';
import { SuperAdminUserActions } from '@/widgets/super-admin-user-actions';
import { UserLockStatus } from '@/widgets/user-lock-status';
import { BulkInviteDialog } from '@/features/bulk-user-invite';
import { Button } from '@ayunis/ui/components/button';
import { Upload } from 'lucide-react';
import { useState } from 'react';
import type { OrgUsersSortField } from '@/shared/api';
import type { TableSort } from '@/shared/lib/table-sort';
import { SortableTableHead } from '@/shared/ui/sortable-table-head';

interface UsersTableProps {
  users: UserResponseDto[];
  orgId: string;
  pagination?: PaginationDto;
  search?: string;
  currentPage: number;
  sort: TableSort<OrgUsersSortField>;
  onSort: (next: Required<TableSort<OrgUsersSortField>>) => void;
}

export default function UsersTable({
  users,
  orgId,
  pagination,
  search,
  currentPage,
  sort,
  onSort,
}: Readonly<UsersTableProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const { t: tUsers } = useTranslation('admin-settings-users');
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false);
  const roleLabels: Record<UserResponseDtoRole, string> = {
    admin: t('table.roleAdmin'),
    manager: t('table.roleManager'),
    user: t('table.roleUser'),
  };
  const total = pagination?.total ?? 0;
  const limit = pagination?.limit ?? 25;
  const totalPages = Math.ceil(total / limit);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {t('header.title')}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {t('header.total', { count: total })}
              </span>
            </CardTitle>
            <CardDescription>{t('header.description')}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setBulkInviteOpen(true)}
              data-testid="super-admin-bulk-invite"
            >
              <Upload />
              {tUsers('inviteMenu.inviteMany')}
            </Button>
            <CreateUserDialog orgId={orgId} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <SuperAdminUsersSearch search={search} orgId={orgId} />
        </div>
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-2 py-10 text-center">
            <h3 className="text-lg font-semibold">{t('empty.title')}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {t('empty.description')}
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    field="name"
                    sort={sort}
                    onSort={onSort}
                    data-testid="org-users-sort-name"
                  >
                    {t('table.name')}
                  </SortableTableHead>
                  <SortableTableHead
                    field="createdAt"
                    sort={sort}
                    onSort={onSort}
                    data-testid="org-users-sort-createdAt"
                  >
                    {t('table.createdAt')}
                  </SortableTableHead>
                  <SortableTableHead
                    field="email"
                    sort={sort}
                    onSort={onSort}
                    data-testid="org-users-sort-email"
                  >
                    {t('table.email')}
                  </SortableTableHead>
                  <SortableTableHead
                    field="role"
                    sort={sort}
                    onSort={onSort}
                    data-testid="org-users-sort-role"
                  >
                    {t('table.role')}
                  </SortableTableHead>
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
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="capitalize">
                      {roleLabels[user.role]}
                    </TableCell>
                    <TableCell>
                      <UserLockStatus isLocked={user.isLocked} />
                    </TableCell>
                    <TableCell className="w-[100px]">
                      <SuperAdminUserActions
                        user={user}
                        showOrganizationLink={false}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <SuperAdminUsersPagination
              currentPage={currentPage}
              totalPages={totalPages}
              search={search}
              orgId={orgId}
            />
          </>
        )}
      </CardContent>
      <BulkInviteDialog
        open={bulkInviteOpen}
        onOpenChange={setBulkInviteOpen}
        orgId={orgId}
      />
    </Card>
  );
}
