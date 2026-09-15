import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { Collapsible } from '@ayunis/ui/components/collapsible';
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from '@ayunis/ui/components/sidebar';
import { WorkspaceIcon } from '@/shared/ui/workspace-icon';
import type { Workspace } from '@/features/workspaces';
import { WorkspaceChatsSubMenu } from './WorkspaceChatsSubMenu';
import { WorkspaceChatsToggle } from './WorkspaceChatsToggle';

interface WorkspaceSidebarItemProps {
  workspace: Workspace;
}

export function WorkspaceSidebarItem({
  workspace,
}: Readonly<WorkspaceSidebarItemProps>) {
  const params = useParams({ strict: false });
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="group/workspace"
      asChild
    >
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={params.workspaceId === workspace.id}
        >
          <Link
            to="/workspaces/$workspaceId"
            params={{ workspaceId: workspace.id }}
          >
            <WorkspaceIcon
              icon={workspace.icon}
              color={workspace.color}
              variant="plain"
              className="size-4"
            />
            <span className="truncate">{workspace.name}</span>
          </Link>
        </SidebarMenuButton>
        <WorkspaceChatsToggle workspaceId={workspace.id} />
        <WorkspaceChatsSubMenu workspaceId={workspace.id} isOpen={isOpen} />
      </SidebarMenuItem>
    </Collapsible>
  );
}
