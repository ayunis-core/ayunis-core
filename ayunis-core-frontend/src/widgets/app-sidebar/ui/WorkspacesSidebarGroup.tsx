import { useTranslation } from 'react-i18next';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from '@ayunis/ui/components/sidebar';
import { useWorkspaces } from '@/features/workspaces';
import { WorkspaceSidebarItem } from './WorkspaceSidebarItem';

export function WorkspacesSidebarGroup() {
  const { t } = useTranslation('common');
  const { workspaces } = useWorkspaces();

  if (workspaces.length === 0) return null;

  return (
    <SidebarGroup data-testid="sidebar-workspaces">
      <SidebarGroupLabel>{t('sidebar.workspaces')}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {workspaces.map((workspace) => (
            <WorkspaceSidebarItem key={workspace.id} workspace={workspace} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
