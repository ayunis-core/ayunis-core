import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ayunis/ui/components/table';
import type { WorkspaceAccess } from '@/features/workspaces';
import { useAuthenticationControllerMe } from '@ayunis/api-client';
import { useRemoveWorkspaceMember } from '@/pages/workspace/api/useRemoveWorkspaceMember';
import {
  canRemoveWorkspaceMember,
  type WorkspaceMember,
  type WorkspaceRolePermissionSet,
} from '@/pages/workspace/model/workspace-members';
import { WorkspaceMemberRoleSelect } from './WorkspaceMemberRoleSelect';

interface WorkspaceMembersListProps {
  workspaceId: string;
  members: WorkspaceMember[];
  access: WorkspaceAccess;
  rolePermissions: readonly WorkspaceRolePermissionSet[] | undefined;
}

export function WorkspaceMembersList({
  workspaceId,
  members,
  access,
  rolePermissions,
}: Readonly<WorkspaceMembersListProps>) {
  const { t } = useTranslation('workspace');
  const { data: currentUser } = useAuthenticationControllerMe();
  const { removeWorkspaceMember, removingUserIds } =
    useRemoveWorkspaceMember(workspaceId);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('members.name')}</TableHead>
          <TableHead>{t('members.email')}</TableHead>
          <TableHead>{t('members.role.label')}</TableHead>
          <TableHead>{t('members.joinedAt')}</TableHead>
          <TableHead className="w-[50px]"></TableHead>
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
              {access.isAdmin ? (
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
            <TableCell>
              {canRemoveWorkspaceMember(access, member, currentUser?.id) && (
                <Button
                  variant="destructive-ghost"
                  size="icon"
                  aria-label={t('members.remove.label', { name: member.name })}
                  onClick={() => removeWorkspaceMember(member)}
                  disabled={removingUserIds.has(member.userId)}
                  data-testid={`workspace-member-remove-${member.userId}`}
                >
                  <Trash2 />
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
