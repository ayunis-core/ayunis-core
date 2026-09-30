import { useTranslation } from 'react-i18next';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
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
import type { Workspace } from '@/features/workspaces';

interface WorkspaceHeaderActionsProps {
  workspace: Workspace;
  onOpenSettings: () => void;
  onOpenDelete: () => void;
}

export function WorkspaceHeaderActions({
  workspace,
  onOpenSettings,
  onOpenDelete,
}: Readonly<WorkspaceHeaderActionsProps>) {
  const { t } = useTranslation('workspace');
  const { t: tWorkspaces } = useTranslation('workspaces');
  const { favorites } = useFavorites();
  const { toggle: togglePinned } = useToggleFavorite();
  const isPinned = isFavorite(favorites, workspace.id, 'workspace');

  return (
    <div className="flex items-center gap-1">
      <HelpLink path="workspaces/" />
      <PinButton
        isPinned={isPinned}
        pinLabel={t('page.pin')}
        unpinLabel={t('page.unpin')}
        onToggle={() => togglePinned('workspace', workspace.id)}
      />
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
          <DropdownMenuItem onClick={onOpenSettings}>
            <Pencil />
            <span>{tWorkspaces('actions.edit')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={onOpenDelete}>
            <Trash2 />
            <span>{tWorkspaces('actions.delete')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
