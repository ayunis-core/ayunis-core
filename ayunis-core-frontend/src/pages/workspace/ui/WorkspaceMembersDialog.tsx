import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ayunis/ui/components/table';
import { getWorkspaceAccess, type Workspace } from '@/features/workspaces';
import { useWorkspaceMembers } from '@/pages/workspace/api/useWorkspaceMembers';
import { useWorkspaceRolePermissions } from '@/pages/workspace/api/useWorkspaceRolePermissions';
import type {
  WorkspaceMember,
  WorkspaceRolePermissionSet,
} from '@/pages/workspace/model/workspace-members';
import { AddWorkspaceMembersForm } from './AddWorkspaceMembersForm';
import { WorkspaceMemberRoleSelect } from './WorkspaceMemberRoleSelect';

interface WorkspaceMembersDialogProps {
  workspace: Workspace;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkspaceMembersDialog({
  workspace,
  open,
  onOpenChange,
}: Readonly<WorkspaceMembersDialogProps>) {
  const { t } = useTranslation('workspace');
  const { isAdmin, canManageMembers } = getWorkspaceAccess(workspace);
  const [isAdding, setIsAdding] = useState(false);
  const { members, isLoading, isError } = useWorkspaceMembers(
    workspace.id,
    open,
  );
  const { rolePermissions } = useWorkspaceRolePermissions(
    workspace.id,
    open && (isAdmin || canManageMembers),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setIsAdding(false);
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="sm:max-w-2xl"
        data-testid="workspace-members-dialog"
      >
        <DialogHeader>
          <DialogTitle>
            {isAdding ? t('members.add.title') : t('members.title')}
          </DialogTitle>
          <DialogDescription>
            {isAdding ? t('members.add.description') : t('members.description')}
          </DialogDescription>
        </DialogHeader>
        {isAdding && canManageMembers ? (
          <AddWorkspaceMembersForm
            workspaceId={workspace.id}
            isAdmin={isAdmin}
            rolePermissions={rolePermissions}
            onDone={() => setIsAdding(false)}
          />
        ) : (
          <div className="space-y-4">
            {canManageMembers ? (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => setIsAdding(true)}
                  data-testid="workspace-members-add"
                >
                  <UserPlus />
                  {t('members.add.open')}
                </Button>
              </div>
            ) : null}
            {isLoading ? <p>{t('members.loading')}</p> : null}
            {isError ? <p role="alert">{t('members.loadError')}</p> : null}
            <WorkspaceMembersTable
              workspaceId={workspace.id}
              members={members}
              canChangeRoles={isAdmin}
              rolePermissions={rolePermissions}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function WorkspaceMembersTable({
  workspaceId,
  members,
  canChangeRoles,
  rolePermissions,
}: Readonly<{
  workspaceId: string;
  members: WorkspaceMember[];
  canChangeRoles: boolean;
  rolePermissions: readonly WorkspaceRolePermissionSet[] | undefined;
}>) {
  const { t } = useTranslation('workspace');
  if (members.length === 0) return null;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('members.name')}</TableHead>
          <TableHead>{t('members.email')}</TableHead>
          <TableHead>{t('members.role.label')}</TableHead>
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
