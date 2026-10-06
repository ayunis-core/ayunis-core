import { Fragment } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Badge } from '@ayunis/ui/components/badge';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { EmptyState } from '@/widgets/empty-state';
import {
  PERMISSION_GROUPS,
  TEAM_ADMIN_PERMISSIONS,
  type EditableOrgRole,
  type PermissionDef,
} from '@/widgets/sharing-prototype/model/permissions';
import {
  togglePermission,
  toggleTeamAdminPermission,
  usePrototypeState,
} from '@/widgets/sharing-prototype/model/prototype-store';
import {
  PermissionGroupRow,
  PermissionHint,
  PermissionRow,
  PermissionTable,
  type MatrixColumn,
} from './PermissionMatrix';

const ORG_COLUMNS: MatrixColumn[] = [
  { key: 'user', header: 'Benutzer' },
  { key: 'manager', header: 'Manager' },
  { key: 'admin', header: 'Admin' },
];

const TEAM_ADMIN_COLUMNS: MatrixColumn[] = [
  { key: 'teamAdmin', header: 'Team-Admin' },
];

interface RoleSummary {
  name: string;
  scope: string;
  text: string;
}

const ROLE_SUMMARIES: RoleSummary[] = [
  {
    name: 'Benutzer',
    scope: 'Organisation',
    text: 'Für die meisten Mitarbeitenden.',
  },
  {
    name: 'Manager',
    scope: 'Organisation',
    text: 'Für einzelne Personen, die mehr dürfen sollen als Benutzer, aber nicht alles. Gilt in der ganzen Organisation, anders als Team-Admin.',
  },
  {
    name: 'Admin',
    scope: 'Organisation',
    text: 'Für die Personen, die Ayunis Core in der Verwaltung betreuen. Darf alles und lässt sich nicht einschränken.',
  },
  {
    name: 'Team-Admin',
    scope: 'Team',
    text: 'Wird pro Team ernannt und behält dazu die Rechte seiner Rolle. Was Team-Admins im eigenen Team dürfen, legen Sie unten fest.',
  },
];

function RolesOverviewCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rollen</CardTitle>
        <CardDescription>Für wen welche Rolle gedacht ist.</CardDescription>
      </CardHeader>
      <CardContent>
        <ItemGroup>
          {ROLE_SUMMARIES.map((summary, index) => (
            <Fragment key={summary.name}>
              {index > 0 && <ItemSeparator />}
              <Item size="sm" className="px-0">
                <ItemContent>
                  <ItemTitle>
                    {summary.name}
                    <Badge variant="outline">{summary.scope}</Badge>
                  </ItemTitle>
                  <ItemDescription className="line-clamp-none">
                    {summary.text}
                  </ItemDescription>
                </ItemContent>
              </Item>
            </Fragment>
          ))}
        </ItemGroup>
      </CardContent>
    </Card>
  );
}

function OrgPermissionRow({
  permission,
  permissions,
}: Readonly<{
  permission: PermissionDef;
  permissions: Record<EditableOrgRole, string[]>;
}>) {
  const editable = (orgRole: EditableOrgRole) => ({
    checked: permissions[orgRole].includes(permission.key),
    label: `${permission.label} für ${orgRole === 'user' ? 'Benutzer' : 'Manager'}`,
    onToggle: () => togglePermission(orgRole, permission.key),
  });
  return (
    <PermissionRow
      label={
        <PermissionHint
          label={permission.label}
          hint={permission.hint}
          isNew={permission.isNew}
        />
      }
      cells={[
        editable('user'),
        editable('manager'),
        { checked: true, label: `${permission.label} für Admin` },
      ]}
    />
  );
}

function OrgRolesCard() {
  const { permissions } = usePrototypeState();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Berechtigungen</CardTitle>
        <CardDescription>
          Legen Sie fest, was Benutzer und Manager tun dürfen. Admins haben
          immer alle Berechtigungen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PermissionTable columns={ORG_COLUMNS}>
          {PERMISSION_GROUPS.map((group) => (
            <Fragment key={group.title}>
              <PermissionGroupRow label={group.title} columns={4} />
              {group.permissions.map((permission) => (
                <OrgPermissionRow
                  key={permission.key}
                  permission={permission}
                  permissions={permissions}
                />
              ))}
            </Fragment>
          ))}
        </PermissionTable>
      </CardContent>
    </Card>
  );
}

function TeamAdminRolesCard() {
  const { teamAdminPermissions } = usePrototypeState();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team-Admins</CardTitle>
        <CardDescription>
          Legen Sie fest, was Team-Admins in ihrem eigenen Team tun dürfen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PermissionTable columns={TEAM_ADMIN_COLUMNS}>
          {TEAM_ADMIN_PERMISSIONS.map((permission) => (
            <PermissionRow
              key={permission.key}
              label={
                <PermissionHint
                  label={permission.label}
                  hint={permission.hint}
                />
              }
              cells={[
                {
                  checked: teamAdminPermissions.includes(permission.key),
                  label: `${permission.label} für Team-Admins`,
                  onToggle: () => toggleTeamAdminPermission(permission.key),
                },
              ]}
            />
          ))}
        </PermissionTable>
        <p className="text-sm text-muted-foreground">
          Den letzten Team-Admin eines Teams können nur Admins ändern oder
          entfernen.
        </p>
      </CardContent>
    </Card>
  );
}

export function PrototypeRolesSettings() {
  const { role } = usePrototypeState();
  if (role !== 'orgAdmin') {
    return (
      <EmptyState
        title="Nur für Admins"
        description="Rollen und Berechtigungen legen Admins der Organisation fest."
      />
    );
  }
  return (
    <div className="space-y-6">
      <RolesOverviewCard />
      <OrgRolesCard />
      <TeamAdminRolesCard />
    </div>
  );
}
