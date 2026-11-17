import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, Users } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { getWorkspaceAccess, type Workspace } from '@/features/workspaces';
import { useWorkspaceRolePermissions } from '@/pages/workspace/api/useWorkspaceRolePermissions';
import type { WorkspaceMember } from '@/pages/workspace/model/workspace-members';
import { AddWorkspaceMembersDialog } from './AddWorkspaceMembersDialog';
import { WorkspaceMembersList } from './WorkspaceMembersList';

interface WorkspaceMembersPageProps {
  workspace: Workspace;
  members: WorkspaceMember[];
}

export function WorkspaceMembersPage({
  workspace,
  members,
}: Readonly<WorkspaceMembersPageProps>) {
  const { t } = useTranslation('workspace');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { isAdmin, canManageMembers } = getWorkspaceAccess(workspace);
  const { rolePermissions } = useWorkspaceRolePermissions(
    workspace.id,
    isAdmin || canManageMembers,
  );

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[
              { label: t('page.breadcrumb'), href: '/workspaces' },
              { label: workspace.name, href: `/workspaces/${workspace.id}` },
              { label: t('members.title') },
            ]}
            action={
              canManageMembers ? (
                <Button
                  size="sm"
                  onClick={() => setIsAddOpen(true)}
                  data-testid="workspace-members-add"
                >
                  <UserPlus />
                  {t('members.add.open')}
                </Button>
              ) : null
            }
          />
        }
        contentArea={
          <Card data-testid="workspace-members-page">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {t('members.title')}
                <Badge variant="secondary">
                  <Users />
                  {t('members.count', { count: members.length })}
                </Badge>
              </CardTitle>
              <CardDescription>{t('members.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <WorkspaceMembersList
                workspaceId={workspace.id}
                members={members}
                canChangeRoles={isAdmin}
                rolePermissions={rolePermissions}
              />
            </CardContent>
          </Card>
        }
      />
      {canManageMembers ? (
        <AddWorkspaceMembersDialog
          workspaceId={workspace.id}
          isAdmin={isAdmin}
          rolePermissions={rolePermissions}
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
        />
      ) : null}
    </AppLayout>
  );
}
