import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDown,
  ArrowUp,
  MoreHorizontal,
  Settings2,
  StarOff,
  Trash,
} from 'lucide-react';
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
import { useConfirmation } from '@/widgets/confirmation-modal';
import {
  useDeleteWorkspace,
  useToggleWorkspacePinned,
  type Workspace,
} from '@/features/workspaces';

interface WorkspaceSidebarItemProps {
  workspace: Workspace;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (workspaceId: string, direction: 'up' | 'down') => void;
  onOpenSettings: (workspace: Workspace) => void;
}

export function WorkspaceSidebarItem({
  workspace,
  canMoveUp,
  canMoveDown,
  onMove,
  onOpenSettings,
}: Readonly<WorkspaceSidebarItemProps>) {
  const { t } = useTranslation('common');
  const { t: tWorkspaces } = useTranslation('workspaces');
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const { confirm } = useConfirmation();
  const { mutate: togglePinned } = useToggleWorkspacePinned();
  const { mutate: deleteWorkspace } = useDeleteWorkspace();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: workspace.id });

  function handleDelete() {
    confirm({
      title: tWorkspaces('deleteDialog.title'),
      description: tWorkspaces('deleteDialog.description', {
        name: workspace.name,
      }),
      confirmText: tWorkspaces('deleteDialog.confirmText'),
      cancelText: tWorkspaces('deleteDialog.cancelText'),
      variant: 'destructive',
      onConfirm: () => {
        const isCurrent = params.workspaceId === workspace.id;
        deleteWorkspace(workspace.id, {
          // Navigate only once the delete went through — a failed delete
          // should leave the user on the still-existing workspace.
          onSuccess: () => {
            if (isCurrent) {
              void navigate({ to: '/chat' });
            }
          },
        });
      },
    });
  }

  return (
    <SidebarMenuItem
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'z-10 opacity-60' : undefined}
      {...attributes}
      {...listeners}
    >
      <SidebarMenuButton asChild isActive={params.workspaceId === workspace.id}>
        <Link
          to="/workspaces/$workspaceId"
          params={{ workspaceId: workspace.id }}
        >
          <WorkspaceIcon
            icon={workspace.icon}
            color={workspace.color}
            variant="plain"
          />
          <span className="truncate">{workspace.name}</span>
        </Link>
      </SidebarMenuButton>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction showOnHover>
            <MoreHorizontal />
            <span className="sr-only">{t('sidebar.workspaceOptions')}</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="rounded-lg" side="bottom" align="end">
          <DropdownMenuItem onClick={() => onOpenSettings(workspace)}>
            <Settings2 />
            <span>{t('sidebar.settings')}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!canMoveUp}
            onClick={() => onMove(workspace.id, 'up')}
          >
            <ArrowUp />
            <span>{t('sidebar.moveUp')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canMoveDown}
            onClick={() => onMove(workspace.id, 'down')}
          >
            <ArrowDown />
            <span>{t('sidebar.moveDown')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => togglePinned(workspace.id)}>
            <StarOff />
            <span>{t('sidebar.unpinWorkspace')}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            <Trash />
            <span>{t('sidebar.deleteWorkspace')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
