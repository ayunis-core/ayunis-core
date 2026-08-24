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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { Button } from '@ayunis/ui/components/button';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  UserCheck,
  Mail,
  Coins,
  Ban,
  ShieldOff,
  LockOpen,
} from 'lucide-react';
import TooltipIf from '@/widgets/tooltip-if/ui/TooltipIf';
import { useUserRoleUpdate } from '@/pages/admin-settings/users-settings/api/useUserRoleUpdate';
import { useUserDelete } from '@/pages/admin-settings/users-settings/api/useUserDelete';
import { useTriggerPasswordReset } from '@/pages/admin-settings/users-settings/api/useTriggerPasswordReset';
import { useResetUserMfa } from '@/pages/admin-settings/users-settings/api/useResetUserMfa';
import { useMe } from '@/widgets/app-sidebar/api/useMe';
import EditUserDialog from './EditUserDialog';
import { useState, type ReactNode } from 'react';
import type {
  User,
  UserRole,
} from '@/pages/admin-settings/users-settings/model/openapi';
import type { UserResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useTranslation } from 'react-i18next';
import { SetUserCreditLimitDialog } from './SetUserCreditLimitDialog';
import {
  useUserCreditLimits,
  type CreditLimitInfo,
} from '@/pages/admin-settings/users-settings/api/useUserCreditLimits';
import { useHasCreditBudget } from '@/features/credit-limits';
import { useAdminUnlockUserAccount } from '@/pages/admin-settings/users-settings/api/useAdminUnlockUserAccount';
import { canViewUserLockStatus } from '@/pages/admin-settings/users-settings/lib/canViewUserLockStatus';
import { UserLockStatus } from '@/widgets/user-lock-status';

const ROLE_OPTIONS: UserRole[] = ['user', 'manager', 'admin'];

interface UsersSectionProps {
  users: User[];
  total: number;
  searchSlot?: ReactNode;
  paginationSlot?: ReactNode;
}

export default function UsersSection({
  users,
  total,
  searchSlot,
  paginationSlot,
}: Readonly<UsersSectionProps>) {
  const { t } = useTranslation('admin-settings-users');
  const { t: tCredit } = useTranslation('admin-settings-credit-limits');
  const { t: tAccountLock } = useTranslation('common', {
    keyPrefix: 'accountLock',
  });
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [creditLimitUser, setCreditLimitUser] = useState<User | null>(null);
  const hasCreditBudget = useHasCreditBudget();
  const { user: currentUser } = useMe();
  const canViewLockStatus = canViewUserLockStatus(currentUser);
  const { userLimits, setUserLimit, removeUserLimit, isSaving, isRemoving } =
    useUserCreditLimits(
      () => setCreditLimitUser(null),
      () => setCreditLimitUser(null),
    );

  const renderCreditLimit = (limit: CreditLimitInfo | undefined) =>
    limit ? (
      tCredit('creditLimits.column.value', {
        used: Math.round(limit.creditsUsed).toLocaleString(),
        limit: Math.round(limit.monthlyCredits).toLocaleString(),
      })
    ) : (
      <span className="text-muted-foreground">
        {tCredit('creditLimits.column.none')}
      </span>
    );
  const { updateUserRole, isLoading: isUpdatingRole } = useUserRoleUpdate({
    onSuccessCallback: () => setLoadingUserId(null),
  });
  const { deleteUser, isLoading: isDeletingUser } = useUserDelete({
    onSuccessCallback: () => setLoadingUserId(null),
  });
  const { triggerPasswordReset, isLoading: isTriggeringReset } =
    useTriggerPasswordReset({
      onSuccessCallback: () => setLoadingUserId(null),
    });
  const { resetUserMfa, isLoading: isResettingMfa } = useResetUserMfa({
    onSuccessCallback: () => setLoadingUserId(null),
  });
  const unlockUserAccount = useAdminUnlockUserAccount();
  const { confirm } = useConfirmation();

  const roleLabels: Record<UserRole, string> = {
    admin: t('users.admin'),
    manager: t('users.manager'),
    user: t('users.user'),
  };

  const handleRoleChange = (user: User, newRole: UserRole) => {
    if (user.role === newRole) {
      return;
    }
    confirm({
      title: t('confirmations.changeUserRoleTitle'),
      description: t('confirmations.changeUserRoleDescription', {
        name: user.name,
        role: roleLabels[newRole],
      }),
      confirmText: t('confirmations.changeRoleText'),
      cancelText: t('confirmations.cancelText'),
      variant: 'default',
      onConfirm: () => {
        setLoadingUserId(user.id);
        updateUserRole({
          id: user.id,
          role: newRole,
        });
      },
    });
  };

  const handleDeleteUser = (user: UserResponseDto) => {
    confirm({
      title: t('confirmations.deleteUserTitle'),
      description: t('confirmations.deleteUserDescription', {
        name: user.name,
      }),
      confirmText: t('confirmations.deleteText'),
      cancelText: t('confirmations.cancelText'),
      variant: 'destructive',
      onConfirm: () => {
        setLoadingUserId(user.id);
        deleteUser(user.id);
      },
    });
  };

  const handleTriggerPasswordReset = (user: UserResponseDto) => {
    confirm({
      title: t('confirmPasswordReset.title'),
      description: t('confirmPasswordReset.description', {
        name: user.name,
        email: user.email,
      }),
      confirmText: t('confirmPasswordReset.confirmText'),
      cancelText: t('confirmPasswordReset.cancelText'),
      variant: 'default',
      onConfirm: () => {
        setLoadingUserId(user.id);
        triggerPasswordReset(user.id);
      },
    });
  };

  const handleResetMfa = (user: UserResponseDto) => {
    confirm({
      title: t('resetMfa.confirmTitle'),
      description: t('resetMfa.confirmDescription', {
        name: user.name,
      }),
      confirmText: t('resetMfa.confirmText'),
      cancelText: t('confirmations.cancelText'),
      variant: 'destructive',
      onConfirm: () => {
        setLoadingUserId(user.id);
        resetUserMfa(user.id);
      },
    });
  };

  const handleUnlockUserAccount = (user: UserResponseDto) => {
    confirm({
      title: tAccountLock('unlock.confirmTitle'),
      description: tAccountLock('unlock.confirmDescription', {
        name: user.name,
      }),
      confirmText: tAccountLock('unlock.confirmText'),
      cancelText: tAccountLock('unlock.cancelText'),
      variant: 'default',
      onConfirm: () => {
        setLoadingUserId(user.id);
        unlockUserAccount.mutate(
          { userId: user.id },
          { onSettled: () => setLoadingUserId(null) },
        );
      },
    });
  };

  const isUserLoading = (userId: string) => {
    return (
      loadingUserId === userId &&
      (isUpdatingRole ||
        isDeletingUser ||
        isTriggeringReset ||
        isResettingMfa ||
        unlockUserAccount.isPending)
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('users.users')}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {t('users.total', { count: total })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {searchSlot && <div className="mb-4">{searchSlot}</div>}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('users.name')}</TableHead>
              <TableHead>{t('users.email')}</TableHead>
              <TableHead>{t('users.role')}</TableHead>
              {canViewLockStatus && <TableHead>{t('users.status')}</TableHead>}
              {hasCreditBudget && (
                <TableHead>{tCredit('creditLimits.column.header')}</TableHead>
              )}
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} data-testid={`admin-user-row-${user.id}`}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{roleLabels[user.role]}</TableCell>
                {canViewLockStatus && (
                  <TableCell>
                    <UserLockStatus isLocked={user.isLocked} />
                  </TableCell>
                )}
                {hasCreditBudget && (
                  <TableCell>
                    {renderCreditLimit(userLimits.get(user.id))}
                  </TableCell>
                )}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        disabled={isUserLoading(user.id)}
                        data-testid="admin-user-actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setEditingUser(user)}
                        disabled={isUserLoading(user.id)}
                      >
                        <Edit />
                        {t('users.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger
                          disabled={isUserLoading(user.id)}
                        >
                          <UserCheck />
                          {t('users.changeRoleLabel')}
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuRadioGroup
                            value={user.role}
                            onValueChange={(value) =>
                              handleRoleChange(user, value as UserRole)
                            }
                          >
                            {ROLE_OPTIONS.map((role) => (
                              <DropdownMenuRadioItem
                                key={role}
                                value={role}
                                disabled={isUserLoading(user.id)}
                              >
                                {roleLabels[role]}
                              </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuItem
                        onClick={() => handleTriggerPasswordReset(user)}
                        disabled={isUserLoading(user.id)}
                      >
                        <Mail />
                        {t('users.sendPasswordReset')}
                      </DropdownMenuItem>
                      {canViewLockStatus &&
                        user.isLocked &&
                        user.id !== currentUser?.id && (
                          <DropdownMenuItem
                            onClick={() => handleUnlockUserAccount(user)}
                            disabled={isUserLoading(user.id)}
                            data-testid="user-unlock-account"
                          >
                            <LockOpen />
                            {tAccountLock('unlock.menuItem')}
                          </DropdownMenuItem>
                        )}
                      <TooltipIf
                        condition={user.email === currentUser?.email}
                        tooltip={t('resetMfa.selfTooltip')}
                      >
                        <DropdownMenuItem
                          onClick={() => handleResetMfa(user)}
                          disabled={
                            isUserLoading(user.id) ||
                            user.email === currentUser?.email
                          }
                        >
                          <ShieldOff />
                          {t('resetMfa.menuItem')}
                        </DropdownMenuItem>
                      </TooltipIf>
                      {hasCreditBudget && (
                        <DropdownMenuItem
                          onClick={() => setCreditLimitUser(user)}
                        >
                          <Coins />
                          {userLimits.has(user.id)
                            ? tCredit('creditLimits.menu.edit')
                            : tCredit('creditLimits.menu.set')}
                        </DropdownMenuItem>
                      )}
                      {hasCreditBudget && userLimits.has(user.id) && (
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => removeUserLimit(user.id)}
                        >
                          <Ban />
                          {tCredit('creditLimits.menu.remove')}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => handleDeleteUser(user)}
                        disabled={isUserLoading(user.id)}
                      >
                        <Trash2 />
                        {t('users.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {paginationSlot}
      </CardContent>
      <EditUserDialog user={editingUser} onClose={() => setEditingUser(null)} />
      {creditLimitUser && (
        <SetUserCreditLimitDialog
          open
          onOpenChange={(open) => !open && setCreditLimitUser(null)}
          targetName={creditLimitUser.name}
          initialMonthlyCredits={
            userLimits.get(creditLimitUser.id)?.monthlyCredits
          }
          onSubmit={(monthlyCredits) =>
            setUserLimit(creditLimitUser.id, monthlyCredits)
          }
          onRemove={
            userLimits.has(creditLimitUser.id)
              ? () => removeUserLimit(creditLimitUser.id)
              : undefined
          }
          isSaving={isSaving}
          isRemoving={isRemoving}
        />
      )}
    </Card>
  );
}
