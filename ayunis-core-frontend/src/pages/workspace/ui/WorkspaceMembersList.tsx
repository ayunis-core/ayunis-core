import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ayunis/ui/components/table';
import type {
  WorkspaceMember,
  WorkspaceRolePermissionSet,
} from '@/pages/workspace/model/workspace-members';
import { WorkspaceMemberRoleSelect } from './WorkspaceMemberRoleSelect';

interface WorkspaceMembersListProps {
  workspaceId: string;
  members: WorkspaceMember[];
  canChangeRoles: boolean;
  rolePermissions: readonly WorkspaceRolePermissionSet[] | undefined;
}

export function WorkspaceMembersList({
  workspaceId,
  members,
  canChangeRoles,
  rolePermissions,
}: Readonly<WorkspaceMembersListProps>) {
  const { t } = useTranslation('workspace');

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('members.name')}</TableHead>
          <TableHead>{t('members.email')}</TableHead>
          <TableHead>{t('members.role.label')}</TableHead>
          <TableHead>{t('members.joinedAt')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow
            key={member.userId}
            data-testid={`workspace-member-${member.userId}`}
          >
            <TableCell className="font-medium">{member.name}</TableCell>
            <TableCell>{member.email}</TableCell>
            <TableCell>
              {canChangeRoles ? (
                <WorkspaceMemberRoleSelect
                  workspaceId={workspaceId}
                  member={member}
                  rolePermissions={rolePermissions}
                />
              ) : (
                <span
                  data-testid={`workspace-member-role-label-${member.userId}`}
                >
                  {t(`members.role.roles.${member.role}`)}
                </span>
              )}
            </TableCell>
            <TableCell>
              {new Date(member.joinedAt).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
