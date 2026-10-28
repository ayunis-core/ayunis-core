import type { ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardAction,
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
import { InviteStatusBadge } from '@/shared/ui/invite-status-badge';

import { Button } from '@ayunis/ui/components/button';
import { Trash2 } from 'lucide-react';
import { useSuperAdminInviteActions } from '@/pages/super-admin-settings/org/lib/useSuperAdminInviteActions';

interface SuperAdminInvitesSectionProps {
  orgId: string;
  invites: InviteResponseDto[];
  total: number;
  searchSlot?: ReactNode;
  paginationSlot?: ReactNode;
}

export default function SuperAdminInvitesSection({
  orgId,
  invites,
  total,
  searchSlot,
  paginationSlot,
}: Readonly<SuperAdminInvitesSectionProps>) {
  const { t } = useTranslation('admin-settings-users');
  const actions = useSuperAdminInviteActions(orgId);
  const roleLabels: Record<InviteResponseDtoRole, string> = {
    admin: t('users.admin'),
    manager: t('users.manager'),
    user: t('users.user'),
  };

  return (
    <Card data-testid="super-admin-invites-section">
      <InvitesHeader
        total={total}
        onDeleteAll={actions.deleteAll}
        disabled={actions.isDeleting}
      />
      <CardContent>
        {searchSlot && <div className="mb-4">{searchSlot}</div>}
        {invites.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            {t('users.noInvitesFound')}
          </p>
        ) : (
          <InvitesTable
            invites={invites}
            roleLabels={roleLabels}
            t={t}
            onDelete={actions.deleteInvite}
            disabled={actions.isDeleting}
          />
        )}
        {paginationSlot}
      </CardContent>
    </Card>
  );
}

function InvitesHeader({
  total,
  onDeleteAll,
  disabled,
}: Readonly<{
  total: number;
  onDeleteAll: () => void;
  disabled: boolean;
}>) {
  const { t } = useTranslation('admin-settings-users');
  return (
    <CardHeader>
      <CardTitle>
        {t('users.invites')}
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          {t('users.total', { count: total })}
        </span>
      </CardTitle>
      <CardAction>
        <Button
          variant="outline"
          size="sm"
          onClick={onDeleteAll}
          disabled={disabled}
          data-testid="super-admin-invites-delete-all"
        >
          <Trash2 />
          {t('users.deleteAll')}
        </Button>
      </CardAction>
    </CardHeader>
  );
}

interface InvitesTableProps {
  invites: InviteResponseDto[];
  roleLabels: Record<InviteResponseDtoRole, string>;
  t: (key: string) => string;
  onDelete: (invite: InviteResponseDto) => void;
  disabled: boolean;
}

function InvitesTable({
  invites,
  roleLabels,
  t,
  onDelete,
  disabled,
}: Readonly<InvitesTableProps>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('users.email')}</TableHead>
          <TableHead>{t('users.role')}</TableHead>
          <TableHead>{t('users.status')}</TableHead>
          <TableHead>{t('users.sentDate')}</TableHead>
          <TableHead>
            <span className="sr-only">{t('users.delete')}</span>
          </TableHead>
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
            <TableCell>
              <InviteStatusBadge status={invite.status} />
            </TableCell>
            <TableCell>{formatDate(invite.sentDate)}</TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('users.delete')}
                disabled={disabled}
                onClick={() => onDelete(invite)}
                data-testid={`super-admin-invite-delete-${invite.id}`}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
