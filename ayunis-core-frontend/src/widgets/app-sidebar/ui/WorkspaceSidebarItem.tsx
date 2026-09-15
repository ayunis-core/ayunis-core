import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, Pencil, Star, StarOff, Trash } from 'lucide-react';
import { Collapsible } from '@ayunis/ui/components/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@ayunis/ui/components/sidebar';
import { WorkspaceIcon } from '@/shared/ui/workspace-icon';
import {
  isFavorite,
  useFavorites,
  useToggleFavorite,
} from '@/features/favorites';
import type { Workspace } from '@/features/workspaces';
import { useDropdownDialogTransition } from '@/shared/hooks/useDropdownDialogTransition';
import { WorkspaceChatsSubMenu } from './WorkspaceChatsSubMenu';
import { WorkspaceChatsToggle } from './WorkspaceChatsToggle';

interface WorkspaceSidebarItemProps {
  workspace: Workspace;
  onOpenSettings: (workspace: Workspace) => void;
  onDelete: (workspace: Workspace) => void;
}

export function WorkspaceSidebarItem({
  workspace,
  onOpenSettings,
  onDelete,
}: Readonly<WorkspaceSidebarItemProps>) {
  const { t } = useTranslation('common');
  const { t: tWorkspaces } = useTranslation('workspaces');
  const params = useParams({ strict: false });
  const [areChatsOpen, setAreChatsOpen] = useState(false);
  const { favorites } = useFavorites();
  const { toggle } = useToggleFavorite();
  const { requestDialogOpen, handleCloseAutoFocus } =
    useDropdownDialogTransition();
  const isPinned = isFavorite(favorites, workspace.id, 'workspace');

  return (
    <Collapsible
      open={areChatsOpen}
      onOpenChange={setAreChatsOpen}
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction
              showOnHover
              className="right-7"
              data-testid={`sidebar-workspace-menu-${workspace.id}`}
            >
              <MoreHorizontal />
              <span className="sr-only">{t('sidebar.workspaceOptions')}</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="rounded-lg"
            side="bottom"
            align="end"
            onCloseAutoFocus={handleCloseAutoFocus}
          >
            <DropdownMenuItem
              onClick={() => requestDialogOpen(() => onOpenSettings(workspace))}
            >
              <Pencil />
              <span>{tWorkspaces('actions.edit')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toggle('workspace', workspace.id)}>
              {isPinned ? <StarOff /> : <Star />}
              <span>
                {isPinned
                  ? t('sidebar.unpinWorkspace')
                  : t('sidebar.pinWorkspace')}
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => requestDialogOpen(() => onDelete(workspace))}
              variant="destructive"
            >
              <Trash />
              <span>{tWorkspaces('actions.delete')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <WorkspaceChatsToggle workspaceId={workspace.id} />
        <WorkspaceChatsSubMenu
          workspaceId={workspace.id}
          isOpen={areChatsOpen}
        />
      </SidebarMenuItem>
    </Collapsible>
  );
}
