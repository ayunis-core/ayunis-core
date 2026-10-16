import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@ayunis/ui/components/alert';
import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Checkbox } from '@ayunis/ui/components/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ayunis/ui/components/table';
import { useTeamAdminPermissionsControllerGet } from '@/shared/api';
import type { TeamAdminPermission } from '@/features/permissions';
import { InfoHint } from '@/shared/ui/info-hint';
import { TEAM_ADMIN_PERMISSIONS } from '@/pages/admin-settings/roles-settings/lib/catalog';
import { useUpdateTeamAdminPermissions } from '@/pages/admin-settings/roles-settings/api/useUpdateTeamAdminPermissions';

function sameSet(
  a: ReadonlySet<TeamAdminPermission>,
  b: ReadonlySet<TeamAdminPermission>,
): boolean {
  return a.size === b.size && [...a].every((permission) => b.has(permission));
}

function TeamAdminPermissionRow({
  permission,
  checked,
  disabled,
  onToggle,
}: Readonly<{
  permission: TeamAdminPermission;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}>) {
  const { t } = useTranslation('admin-settings-roles');

  return (
    <TableRow>
      <TableCell className="font-medium">
        <InfoHint
          label={t(`teamAdmins.permissions.${permission}`)}
          hint={t(`teamAdmins.permissionHints.${permission}`)}
          testId={`team-admin-permission-hint-${permission}`}
        />
      </TableCell>
      <TableCell className="text-center">
        <Checkbox
          checked={checked}
          disabled={disabled}
          onCheckedChange={onToggle}
          aria-label={`${permission}-teamAdmin`}
        />
      </TableCell>
    </TableRow>
  );
}

function TeamAdminPermissionsTable({
  saved,
}: Readonly<{ saved: ReadonlySet<TeamAdminPermission> }>) {
  const { t } = useTranslation('admin-settings-roles');
  const [draft, setDraft] = useState<Set<TeamAdminPermission> | null>(null);
  const rows = draft ?? saved;
  const { save, isSaving } = useUpdateTeamAdminPermissions({
    onSaved: () => setDraft(null),
  });

  function toggle(permission: TeamAdminPermission) {
    const next = new Set(rows);
    if (next.has(permission)) next.delete(permission);
    else next.add(permission);
    setDraft(next);
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('columns.permission')}</TableHead>
            <TableHead align="center">{t('teamAdmins.column')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {TEAM_ADMIN_PERMISSIONS.map((permission) => (
            <TeamAdminPermissionRow
              key={permission}
              permission={permission}
              checked={rows.has(permission)}
              disabled={isSaving}
              onToggle={() => toggle(permission)}
            />
          ))}
        </TableBody>
      </Table>
      <p className="text-sm text-muted-foreground">{t('teamAdmins.note')}</p>
      <div className="flex justify-end">
        <Button
          data-testid="team-admin-permissions-save"
          onClick={() => void save(rows)}
          disabled={isSaving || sameSet(rows, saved)}
        >
          {isSaving ? t('saving') : t('save')}
        </Button>
      </div>
    </>
  );
}

export function TeamAdminPermissionsCard() {
  const { t } = useTranslation('admin-settings-roles');
  const { data, isLoading, isError, refetch } =
    useTeamAdminPermissionsControllerGet();
  const saved = useMemo(
    () => new Set<TeamAdminPermission>(data?.permissions ?? []),
    [data],
  );

  return (
    <Card data-testid="team-admin-permissions">
      <CardHeader>
        <CardTitle>{t('teamAdmins.title')}</CardTitle>
        <CardDescription>{t('teamAdmins.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {isError && (
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
        )}
        {data && !isError && <TeamAdminPermissionsTable saved={saved} />}
      </CardContent>
    </Card>
  );
}
