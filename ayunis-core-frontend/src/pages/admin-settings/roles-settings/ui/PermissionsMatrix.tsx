import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@ayunis/ui/components/table';
import {
  ROLE_COLUMNS,
  type EditableRole,
  type Permission,
  type RolePermissionsDraft,
} from '@/pages/admin-settings/roles-settings/model/types';
import {
  changedRoles,
  toggleDraft,
} from '@/pages/admin-settings/roles-settings/lib/role-permissions-draft';
import {
  NEW_PERMISSIONS,
  PERMISSION_SECTIONS,
} from '@/pages/admin-settings/roles-settings/lib/catalog';
import { useUpdateRolePermissions } from '@/pages/admin-settings/roles-settings/api/useUpdateRolePermissions';
import { PermissionMatrixRow } from './PermissionMatrixRow';
import { PermissionGroupHeader } from './PermissionGroupHeader';

function PermissionsMatrixHeader() {
  const { t } = useTranslation('admin-settings-roles');

  return (
    <TableHeader>
      <TableRow>
        <TableHead>{t('columns.permission')}</TableHead>
        {ROLE_COLUMNS.map((role) => (
          <TableHead key={role} align="center">
            {t(`columns.${role}`)}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

interface PermissionsMatrixProps {
  serverDraft: RolePermissionsDraft;
}

export function PermissionsMatrix({
  serverDraft,
}: Readonly<PermissionsMatrixProps>) {
  const { t } = useTranslation('admin-settings-roles');
  const [draft, setDraft] = useState<RolePermissionsDraft | null>(null);
  const rows = draft ?? serverDraft;
  const hasChanges = changedRoles(rows, serverDraft).length > 0;
  const { save, isSaving } = useUpdateRolePermissions({
    onSaved: () => setDraft(null),
  });

  function handleToggle(role: EditableRole, permission: Permission) {
    setDraft(toggleDraft(rows, role, permission));
  }

  return (
    <>
      <Table>
        <PermissionsMatrixHeader />
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
                  isNew={NEW_PERMISSIONS.has(permission)}
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

      <div className="flex justify-end">
        <Button
          data-testid="roles-save"
          onClick={() => void save(rows, serverDraft)}
          disabled={isSaving || !hasChanges}
        >
          {isSaving ? t('saving') : t('save')}
        </Button>
      </div>
    </>
  );
}
