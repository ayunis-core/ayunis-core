import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/shadcn/table';
import { useTranslation } from 'react-i18next';
import type { SuperAdminOrgResponseDto } from '@/shared/api';
import { useRouter } from '@tanstack/react-router';
import { formatDate } from '@/shared/lib/format-date';

interface OrgsTableProps {
  orgs: SuperAdminOrgResponseDto[];
}

export default function OrgsTable({ orgs }: OrgsTableProps) {
  const { t } = useTranslation('super-admin-settings-orgs');
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('header.title')}</CardTitle>
        <CardDescription>{t('header.description')}</CardDescription>
      </CardHeader>
      <CardContent>
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
                <TableHead>{t('table.name')}</TableHead>
                <TableHead>{t('table.createdAt')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((org) => (
                <TableRow
                  key={org.id}
                  onClick={() => {
                    void router.navigate({
                      to: '/super-admin-settings/orgs/$id',
                      params: { id: org.id },
                    });
                  }}
                >
                  <TableCell className="font-medium">{org.name}</TableCell>
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
