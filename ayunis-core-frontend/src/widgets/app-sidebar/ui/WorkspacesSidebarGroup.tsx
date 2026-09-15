import { useTranslation } from 'react-i18next';
import { SidebarMenu } from '@ayunis/ui/components/sidebar';
import { useWorkspaces } from '@/features/workspaces';
import { WorkspaceSidebarItem } from './WorkspaceSidebarItem';
import { SidebarCollapsibleGroup } from './SidebarCollapsibleGroup';

export function WorkspacesSidebarGroup() {
  const { t } = useTranslation('common');
  const { workspaces } = useWorkspaces();

  if (workspaces.length === 0) return null;

  return (
    <SidebarCollapsibleGroup
      label={t('sidebar.workspaces')}
      storageKey="sidebar_workspaces_open"
      testId="sidebar-workspaces"
    >
      <SidebarMenu>
        {workspaces.map((workspace) => (
          <WorkspaceSidebarItem key={workspace.id} workspace={workspace} />
        ))}
      </SidebarMenu>
    </SidebarCollapsibleGroup>
  );
}
