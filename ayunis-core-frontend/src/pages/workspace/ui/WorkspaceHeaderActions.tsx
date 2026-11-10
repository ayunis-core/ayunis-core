import { useTranslation } from 'react-i18next';
import { MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { PinButton } from '@/shared/ui/pin-button';
import {
  isFavorite,
  useFavorites,
  useToggleFavorite,
} from '@/features/favorites';
import { getWorkspaceAccess, type Workspace } from '@/features/workspaces';

interface WorkspaceHeaderActionsProps {
  workspace: Workspace;
  onOpenMembers: () => void;
  onOpenSettings: () => void;
  onOpenDelete: () => void;
}

export function WorkspaceHeaderActions({
  workspace,
  onOpenMembers,
  onOpenSettings,
  onOpenDelete,
}: Readonly<WorkspaceHeaderActionsProps>) {
  const { t } = useTranslation('workspace');
  const { t: tWorkspaces } = useTranslation('workspaces');
  const { favorites } = useFavorites();
  const { toggle: togglePinned } = useToggleFavorite();
  const isPinned = isFavorite(favorites, workspace.id, 'workspace');
  const { canManage, isAdmin } = getWorkspaceAccess(workspace);

  return (
    <div className="flex items-center gap-1">
      <HelpLink path="workspaces/" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('members.open')}
            onClick={onOpenMembers}
            data-testid="workspace-members-open"
          >
            <Users />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('members.open')}</TooltipContent>
      </Tooltip>
      <PinButton
        isPinned={isPinned}
        pinLabel={t('page.pin')}
        unpinLabel={t('page.unpin')}
        onToggle={() => togglePinned('workspace', workspace.id)}
      />
      {canManage || isAdmin ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={tWorkspaces('actions.more')}
              data-testid="workspace-actions-menu"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canManage ? (
              <DropdownMenuItem
                onClick={onOpenSettings}
                data-testid="workspace-actions-edit"
              >
                <Pencil />
                <span>{tWorkspaces('actions.edit')}</span>
              </DropdownMenuItem>
            ) : null}
            {isAdmin ? (
              <DropdownMenuItem
                variant="destructive"
                onClick={onOpenDelete}
                data-testid="workspace-actions-delete"
              >
                <Trash2 />
                <span>{tWorkspaces('actions.delete')}</span>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
