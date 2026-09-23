import type { ReactNode } from 'react';
import {
  Card,
  CardContent,
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
import type { InviteResponseDto, InviteResponseDtoRole } from '@/shared/api';
import { formatDate } from '@/shared/lib/format-date';

interface SuperAdminInvitesSectionProps {
  invites: InviteResponseDto[];
  total: number;
  searchSlot?: ReactNode;
  paginationSlot?: ReactNode;
}

export default function SuperAdminInvitesSection({
  invites,
  total,
  searchSlot,
  paginationSlot,
}: Readonly<SuperAdminInvitesSectionProps>) {
  const { t } = useTranslation('admin-settings-users');
  const roleLabels: Record<InviteResponseDtoRole, string> = {
    admin: t('users.admin'),
    manager: t('users.manager'),
    user: t('users.user'),
  };

  return (
    <Card data-testid="super-admin-invites-section">
      <CardHeader>
        <CardTitle>
          {t('users.invites')}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {t('users.total', { count: total })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {searchSlot && <div className="mb-4">{searchSlot}</div>}
        {invites.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            {t('users.noInvitesFound')}
          </p>
        ) : (
          <InvitesTable invites={invites} roleLabels={roleLabels} t={t} />
        )}
        {paginationSlot}
      </CardContent>
    </Card>
  );
}

interface InvitesTableProps {
  invites: InviteResponseDto[];
  roleLabels: Record<InviteResponseDtoRole, string>;
  t: (key: string) => string;
}

function InvitesTable({ invites, roleLabels, t }: Readonly<InvitesTableProps>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('users.email')}</TableHead>
          <TableHead>{t('users.role')}</TableHead>
          <TableHead>{t('users.status')}</TableHead>
          <TableHead>{t('users.sentDate')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invites.map((invite) => (
          <TableRow
            key={invite.id}
            data-testid={`super-admin-invite-row-${invite.id}`}
          >
            <TableCell className="font-medium">{invite.email}</TableCell>
            <TableCell>{roleLabels[invite.role]}</TableCell>
            <TableCell>{t(`users.${invite.status}`)}</TableCell>
            <TableCell>{formatDate(invite.sentDate)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
