import { useTranslation } from 'react-i18next';
import { Settings2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
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
}

export function WorkspaceHeaderActions({
  workspace,
  onOpenSettings,
}: Readonly<WorkspaceHeaderActionsProps>) {
  const { t } = useTranslation('workspace');
  const { favorites } = useFavorites();
  const { toggle: togglePinned } = useToggleFavorite();
  const isPinned = isFavorite(favorites, workspace.id, 'workspace');

  return (
    <div className="flex items-center gap-1">
      <PinButton
        isPinned={isPinned}
        pinLabel={t('page.pin')}
        unpinLabel={t('page.unpin')}
        onToggle={() => togglePinned('workspace', workspace.id)}
      />
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('page.settings')}
        onClick={onOpenSettings}
      >
        <Settings2 />
      </Button>
    </div>
  );
}
