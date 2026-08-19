import { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Loader2 } from 'lucide-react';
import SettingsLayout from '@/pages/admin-settings/admin-settings-layout';
import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Alert, AlertDescription } from '@ayunis/ui/components/alert';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@ayunis/ui/components/table';
import { useRolePermissionsControllerGet } from '@/shared/api';
import type {
  EditableRole,
  RolePermissionsDraft,
  Permission,
} from '@/pages/admin-settings/roles-settings/model/types';
import {
  buildDraft,
  changedRoles,
  toggleDraft,
} from '@/pages/admin-settings/roles-settings/lib/role-permissions-draft';
import { PERMISSION_SECTIONS } from '@/pages/admin-settings/roles-settings/lib/catalog';
import { useUpdateRolePermissions } from '@/pages/admin-settings/roles-settings/api/useUpdateRolePermissions';
import { PermissionMatrixRow } from './PermissionMatrixRow';
import { PermissionGroupHeader } from './PermissionGroupHeader';
import { InfoHint } from './InfoHint';

const ROLE_COLUMNS = ['user', 'manager', 'admin'] as const;

export function RolesSettingsPage() {
  const { t: tLayout } = useTranslation('admin-settings-layout');
  const { t } = useTranslation('admin-settings-roles');

  const { data, isLoading, isError, refetch } =
    useRolePermissionsControllerGet();
  const serverDraft = useMemo(() => buildDraft(data?.roles ?? []), [data]);

  const [draft, setDraft] = useState<RolePermissionsDraft | null>(null);
  const rows = draft ?? serverDraft;
  const hasChanges = changedRoles(rows, serverDraft).length > 0;
  const { save, isSaving } = useUpdateRolePermissions({
    onSaved: () => setDraft(null),
  });

  function handleToggle(role: EditableRole, p: Permission) {
    setDraft(toggleDraft(rows, role, p));
  }

  if (isLoading) {
    return (
      <SettingsLayout title={tLayout('layout.roles')}>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </SettingsLayout>
    );
  }

  if (isError) {
    return (
      <SettingsLayout title={tLayout('layout.roles')}>
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('loadError')}
                <Button
                  variant="link"
                  className="ml-2 h-auto p-0"
                  onClick={() => void refetch()}
                >
                  {t('retry')}
                </Button>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout title={tLayout('layout.roles')}>
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columns.permission')}</TableHead>
                {ROLE_COLUMNS.map((role) => (
                  <TableHead key={role} align="center">
                    <InfoHint
                      label={t(`columns.${role}`)}
                      hint={t(`roleHints.${role}`)}
                      testId={`role-hint-${role}`}
                    />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSION_SECTIONS.map((section) => (
                <Fragment key={section.group}>
                  <PermissionGroupHeader label={t(`groups.${section.group}`)} />
                  {section.permissions.map((permission) => (
                    <PermissionMatrixRow
                      key={permission}
                      permission={permission}
                      label={t(`permissions.${permission}`)}
                      hint={t(`permissionHints.${permission}`)}
                      userChecked={rows.user.has(permission)}
                      managerChecked={rows.manager.has(permission)}
                      disabled={isSaving}
                      onToggle={(role) => handleToggle(role, permission)}
                    />
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>

          <p className="text-sm text-muted-foreground">{t('adminHint')}</p>

          <div className="flex justify-end">
            <Button
              onClick={() => void save(rows, serverDraft)}
              disabled={isSaving || !hasChanges}
            >
              {isSaving ? t('saving') : t('save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </SettingsLayout>
  );
}
