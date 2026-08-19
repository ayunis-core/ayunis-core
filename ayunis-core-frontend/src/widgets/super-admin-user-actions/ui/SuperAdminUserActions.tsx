import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { useNavigate } from '@tanstack/react-router';
import { Building2, Mail, MoreHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useSuperAdminDeleteUser,
  useSuperAdminTriggerPasswordReset,
} from '@/features/super-admin-user-actions';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { PasswordResetSuccessDialog } from './PasswordResetSuccessDialog';

interface ActionableUser {
  id: string;
  name: string;
  email: string;
  orgId: string;
}

interface SuperAdminUserActionsProps {
  user: ActionableUser;
  showOrganizationLink?: boolean;
}

export function SuperAdminUserActions({
  user,
  showOrganizationLink = true,
}: Readonly<SuperAdminUserActionsProps>) {
  const { t } = useTranslation('super-admin-settings-org');
  const navigate = useNavigate();
  const { confirm } = useConfirmation();
  const deleteUser = useSuperAdminDeleteUser(user.orgId);
  const [resetDialog, setResetDialog] = useState({
    open: false,
    resetUrl: '',
  });
  const resetPassword = useSuperAdminTriggerPasswordReset({
    onSuccess: (resetUrl) => setResetDialog({ open: true, resetUrl }),
  });
  const isPending = deleteUser.isPending || resetPassword.isPending;

  function confirmPasswordReset() {
    confirm({
      title: t('confirmPasswordReset.title'),
      description: t('confirmPasswordReset.description', {
        name: user.name,
        email: user.email,
      }),
      confirmText: t('confirmPasswordReset.confirmText'),
      cancelText: t('confirmPasswordReset.cancelText'),
      variant: 'default',
      onConfirm: () => resetPassword.mutate({ userId: user.id }),
    });
  }

  function confirmDelete() {
    confirm({
      title: t('confirmDelete.title'),
      description: t('confirmDelete.description', { name: user.name }),
      confirmText: t('confirmDelete.confirmText'),
      cancelText: t('confirmDelete.cancelText'),
      variant: 'destructive',
      onConfirm: () => deleteUser.mutate({ userId: user.id }),
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={isPending}
            data-testid="super-admin-user-actions"
          >
            <MoreHorizontal />
            <span className="sr-only">{t('table.actions')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={confirmPasswordReset}
            data-testid="super-admin-user-reset-password"
          >
            <Mail />
            {t('table.sendPasswordReset')}
          </DropdownMenuItem>
          {showOrganizationLink && (
            <DropdownMenuItem
              onClick={() =>
                void navigate({
                  to: '/super-admin-settings/orgs/$id',
                  params: { id: user.orgId },
                })
              }
              data-testid="super-admin-user-open-organization"
            >
              <Building2 />
              {t('table.openOrganization')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            variant="destructive"
            onClick={confirmDelete}
            data-testid="super-admin-user-delete"
          >
            <Trash2 />
            {t('table.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PasswordResetSuccessDialog
        open={resetDialog.open}
        onOpenChange={(open) =>
          setResetDialog((current) => ({ ...current, open }))
        }
        resetUrl={resetDialog.resetUrl}
        userEmail={user.email}
      />
    </>
  );
}
