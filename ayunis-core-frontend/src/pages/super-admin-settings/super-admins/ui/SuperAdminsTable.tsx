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
import { Button } from '@/shared/ui/shadcn/button';
import { useTranslation } from 'react-i18next';
import type { SuperAdminUserResponseDto } from '@/shared/api';
import { useAuthenticationControllerMe } from '@/shared/api';
import { useRemoveSuperAdmin } from '../api/useRemoveSuperAdmin';
import { useConfirmation } from '@/widgets/confirmation-modal';

interface SuperAdminsTableProps {
  superAdmins: SuperAdminUserResponseDto[];
}

export default function SuperAdminsTable({
  superAdmins,
}: Readonly<SuperAdminsTableProps>) {
  const { t } = useTranslation('super-admin-settings-super-admins');
  const { removeSuperAdmin, isRemoving } = useRemoveSuperAdmin();
  const { confirm } = useConfirmation();
  const { data: currentUser } = useAuthenticationControllerMe();

  const handleRemove = (user: SuperAdminUserResponseDto) => {
    confirm({
      title: t('confirmRemove.title'),
      description: t('confirmRemove.description', { name: user.name }),
      confirmText: t('confirmRemove.confirmText'),
      cancelText: t('confirmRemove.cancelText'),
      variant: 'destructive',
      onConfirm: () => {
        removeSuperAdmin(user.id);
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('header.title')}</CardTitle>
        <CardDescription>{t('header.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {superAdmins.length === 0 ? (
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
                <TableHead>{t('table.email')}</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {superAdmins.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {currentUser &&
                      user.email.toLowerCase() !==
                        currentUser.email.toLowerCase() && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={isRemoving}
                          onClick={() => handleRemove(user)}
                        >
                          {t('actions.remove')}
                        </Button>
                      )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
