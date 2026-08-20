import { useTranslation } from 'react-i18next';
import { Settings2, Share2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { PinButton } from '@/shared/ui/pin-button';
import {
  isFavorite,
  useFavorites,
  useToggleFavorite,
} from '@/features/favorites';
import {
  canEditWorkspace,
  canShareWorkspace,
  type Workspace,
} from '@/features/workspaces';

interface WorkspaceHeaderActionsProps {
  workspace: Workspace;
  onOpenSettings: () => void;
  onOpenSharing: () => void;
}

export function WorkspaceHeaderActions({
  workspace,
  onOpenSettings,
  onOpenSharing,
}: Readonly<WorkspaceHeaderActionsProps>) {
  const { t } = useTranslation('workspace');
  const { favorites } = useFavorites();
  const { toggle: togglePinned } = useToggleFavorite();
  const isPinned = isFavorite(favorites, workspace.id, 'workspace');

  return (
    <div className="flex items-center gap-1">
      {workspace.isOwner ? (
        <PinButton
          isPinned={isPinned}
          pinLabel={t('page.pin')}
          unpinLabel={t('page.unpin')}
          onToggle={() => togglePinned('workspace', workspace.id)}
        />
      ) : null}
      {canEditWorkspace(workspace.role) ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('page.settings')}
          onClick={onOpenSettings}
        >
          <Settings2 />
        </Button>
      ) : null}
      {canShareWorkspace(workspace.role) ? (
        <Button
          variant="outline"
          size="sm"
          data-testid="workspace-sharing-open"
          onClick={onOpenSharing}
        >
          <Share2 /> {t('page.share')}
        </Button>
      ) : null}
    </div>
  );
}
