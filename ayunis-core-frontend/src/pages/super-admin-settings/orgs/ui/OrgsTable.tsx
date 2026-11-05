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
  OrgsSortField,
  SuperAdminOrgOverviewResponseDto,
} from '@/shared/api';
import type { TableSort } from '@/shared/lib/table-sort';
import { SortableTableHead } from '@/shared/ui/sortable-table-head';
import { OrgLifecycleBadge } from '@/widgets/org-lifecycle-badge';
import { useRouter } from '@tanstack/react-router';
import { formatDate } from '@/shared/lib/format-date';
import type { ReactNode } from 'react';

interface OrgsTableProps {
  orgs: SuperAdminOrgOverviewResponseDto[];
  sort: TableSort<OrgsSortField>;
  onSort: (next: Required<TableSort<OrgsSortField>>) => void;
  searchSlot?: ReactNode;
}

export default function OrgsTable({
  orgs,
  sort,
  onSort,
  searchSlot,
}: Readonly<OrgsTableProps>) {
  const { t } = useTranslation('super-admin-settings-orgs');
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('header.title')}</CardTitle>
        <CardDescription>{t('header.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {searchSlot && <div className="mb-4">{searchSlot}</div>}
        {orgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-2 py-10 text-center">
            <h3 className="text-lg font-semibold">{t('empty.title')}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {t('empty.description')}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  field="name"
                  sort={sort}
                  onSort={onSort}
                  data-testid="orgs-sort-name"
                >
                  {t('table.name')}
                </SortableTableHead>
                <TableHead>{t('table.status')}</TableHead>
                <SortableTableHead
                  field="createdAt"
                  sort={sort}
                  onSort={onSort}
                  data-testid="orgs-sort-createdAt"
                >
                  {t('table.createdAt')}
                </SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((org) => (
                <TableRow
                  key={org.id}
                  data-testid={`org-row-${org.id}`}
                  className="cursor-pointer"
                  onClick={() => {
                    void router.navigate({
                      to: '/super-admin-settings/orgs/$id',
                      params: { id: org.id },
                    });
                  }}
                >
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell>
                    <OrgLifecycleBadge status={org.lifecycleStatus} />
                  </TableCell>
                  <TableCell>{formatDate(org.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
