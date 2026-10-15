import { useTranslation } from 'react-i18next';
import { ArrowRightLeft, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { PinButton } from '@/shared/ui/pin-button';
import {
  isFavorite,
  useFavorites,
  useToggleFavorite,
} from '@/features/favorites';
import {
  canManageWorkspace,
  isWorkspaceOwner,
  type Workspace,
} from '@/features/workspaces';
import { WorkspaceMembersButton } from '@/widgets/workspace-members-dialog';
import { useDropdownDialogTransition } from '@/shared/hooks/useDropdownDialogTransition';

interface WorkspaceHeaderActionsProps {
  workspace: Workspace;
  onOpenSettings: () => void;
  onOpenTransfer: () => void;
  onOpenDelete: () => void;
}

export function WorkspaceHeaderActions({
  workspace,
  onOpenSettings,
  onOpenTransfer,
  onOpenDelete,
}: Readonly<WorkspaceHeaderActionsProps>) {
  const { t } = useTranslation('workspace');
  const { t: tWorkspaces } = useTranslation('workspaces');
  const { favorites } = useFavorites();
  const { toggle: togglePinned } = useToggleFavorite();
  const isPinned = isFavorite(favorites, workspace.id, 'workspace');
  const { requestDialogOpen, handleCloseAutoFocus } =
    useDropdownDialogTransition();

  return (
    <div className="flex items-center gap-1">
      <HelpLink path="workspaces/" />
      <PinButton
        isPinned={isPinned}
        pinLabel={t('page.pin')}
        unpinLabel={t('page.unpin')}
        onToggle={() => togglePinned('workspace', workspace.id)}
      />
      <WorkspaceMembersButton workspace={workspace} />
      {canManageWorkspace(workspace.accessLevel) && (
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
          <DropdownMenuContent
            align="end"
            onCloseAutoFocus={handleCloseAutoFocus}
          >
            <DropdownMenuItem onClick={() => requestDialogOpen(onOpenSettings)}>
              <Pencil />
              <span>{tWorkspaces('actions.edit')}</span>
            </DropdownMenuItem>
            {isWorkspaceOwner(workspace.accessLevel) && (
              <>
                <DropdownMenuItem
                  onClick={() => requestDialogOpen(onOpenTransfer)}
                  data-testid="workspace-transfer-action"
                >
                  <ArrowRightLeft />
                  <span>{tWorkspaces('actions.transfer')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => requestDialogOpen(onOpenDelete)}
                  data-testid="workspace-delete-action"
                >
                  <Trash2 />
                  <span>{tWorkspaces('actions.delete')}</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
