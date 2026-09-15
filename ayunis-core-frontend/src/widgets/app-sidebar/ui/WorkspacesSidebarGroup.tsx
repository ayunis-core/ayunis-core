import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SidebarMenu } from '@ayunis/ui/components/sidebar';
import { useWorkspaces, type Workspace } from '@/features/workspaces';
import { WorkspaceSidebarItem } from './WorkspaceSidebarItem';
import { WorkspaceSidebarDialogs } from './WorkspaceSidebarDialogs';
import { SidebarCollapsibleGroup } from './SidebarCollapsibleGroup';

export function WorkspacesSidebarGroup() {
  const { t } = useTranslation('common');
  const { workspaces } = useWorkspaces();
  const [settingsWorkspace, setSettingsWorkspace] = useState<Workspace | null>(
    null,
  );
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(
    null,
  );

  if (workspaces.length === 0) return null;

  return (
    <>
      <SidebarCollapsibleGroup
        label={t('sidebar.workspaces')}
        storageKey="sidebar_workspaces_open"
        testId="sidebar-workspaces"
      >
        <SidebarMenu>
          {workspaces.map((workspace) => (
            <WorkspaceSidebarItem
              key={workspace.id}
              workspace={workspace}
              onOpenSettings={setSettingsWorkspace}
              onDelete={setWorkspaceToDelete}
            />
          ))}
        </SidebarMenu>
      </SidebarCollapsibleGroup>
      <WorkspaceSidebarDialogs
        settingsWorkspace={settingsWorkspace}
        workspaceToDelete={workspaceToDelete}
        onCloseSettings={() => setSettingsWorkspace(null)}
        onCloseDelete={() => setWorkspaceToDelete(null)}
      />
    </>
  );
}
