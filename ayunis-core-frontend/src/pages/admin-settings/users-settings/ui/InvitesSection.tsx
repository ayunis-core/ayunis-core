import type { ReactNode } from 'react';
import { TableCell, TableHead, TableRow } from '@/shared/ui/shadcn/table';
import { TableBody } from '@/shared/ui/shadcn/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';
import { Button } from '@/shared/ui/shadcn/button';
import { MoreHorizontal, RefreshCw, Trash2 } from 'lucide-react';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Table, TableHeader } from '@/shared/ui/shadcn/table';
import { useInviteDelete } from '../api/useInviteDelete';
import { useDeleteAllInvites } from '../api/useDeleteAllInvites';
import { useInviteResend } from '../api/useInviteResend';
import type { Invite } from '../model/openapi';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useTranslation } from 'react-i18next';

interface InvitesSectionProps {
  invites: Invite[];
  totalInvites: number;
  searchSlot?: ReactNode;
  paginationSlot?: ReactNode;
}

export default function InvitesSection({
  invites,
  totalInvites,
  searchSlot,
  paginationSlot,
}: Readonly<InvitesSectionProps>) {
  const { t } = useTranslation('admin-settings-users');
  const { deleteInvite, isLoading: isDeletingInvite } = useInviteDelete();
  const { deleteAllInvites, isDeleting } = useDeleteAllInvites();
  const { resendInvite, isResending } = useInviteResend();
  const { confirm } = useConfirmation();

  const handleDeleteInvite = (invite: Invite) => {
    confirm({
      title: t('confirmations.deleteInviteTitle'),
      description: t('confirmations.deleteInviteDescription', {
        email: invite.email,
      }),
      confirmText: t('confirmations.deleteText'),
      cancelText: t('confirmations.cancelText'),
      variant: 'destructive',
      onConfirm: () => deleteInvite({ id: invite.id }),
    });
  };

  const handleResendInvite = (invite: Invite) => {
    confirm({
      title: t('confirmations.resendInviteTitle'),
      description: t('confirmations.resendInviteDescription', {
        email: invite.email,
      }),
      confirmText: t('confirmations.resendText'),
      cancelText: t('confirmations.cancelText'),
      onConfirm: () => resendInvite(invite.id),
    });
  };

  const handleDeleteAllInvites = () => {
    confirm({
      title: t('confirmations.deleteAllInvitesTitle'),
      description: t('confirmations.deleteAllInvitesDescription', {
        count: totalInvites,
      }),
      confirmText: t('confirmations.deleteText'),
      cancelText: t('confirmations.cancelText'),
      variant: 'destructive',
      onConfirm: () => deleteAllInvites(),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('users.invites')}</CardTitle>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteAllInvites}
            disabled={isDeleting || isDeletingInvite || totalInvites === 0}
          >
            <Trash2 className="h-4 w-4" />
            {t('users.deleteAll')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {searchSlot && <div className="mb-4">{searchSlot}</div>}
        {invites.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t('users.noInvitesFound')}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('users.email')}</TableHead>
                <TableHead>{t('users.role')}</TableHead>
                <TableHead>{t('users.status')}</TableHead>
                <TableHead>{t('users.sentDate')}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell className="font-medium">{invite.email}</TableCell>
                  <TableCell>
                    {invite.role === 'admin'
                      ? t('users.admin')
                      : t('users.user')}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const statusColorMap: Record<string, string> = {
                        pending: 'bg-yellow-100 text-yellow-800',
                        accepted: 'bg-green-100 text-green-800',
                      };
                      const statusColor =
                        statusColorMap[invite.status] ??
                        'bg-red-100 text-red-800';
                      return (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
                        >
                          {t(`users.${invite.status}`)}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {new Date(invite.sentDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {invite.status === 'expired' && (
                          <DropdownMenuItem
                            onClick={() => handleResendInvite(invite)}
                            disabled={isResending}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            {t('users.resend')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteInvite(invite)}
                          disabled={isDeletingInvite}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('users.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {paginationSlot}
      </CardContent>
    </Card>
  );
}
