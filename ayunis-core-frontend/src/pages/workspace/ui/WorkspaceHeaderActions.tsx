import { useTranslation } from 'react-i18next';
import { Settings2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { PinButton } from '@/shared/ui/pin-button';
import {
  useToggleWorkspacePinned,
  type Workspace,
} from '@/features/workspaces';

interface WorkspaceHeaderActionsProps {
  workspace: Workspace;
  onOpenSettings: () => void;
}

export function WorkspaceHeaderActions({
  workspace,
  onOpenSettings,
}: Readonly<WorkspaceHeaderActionsProps>) {
  const { t } = useTranslation('workspace');
  const { mutate: togglePinned } = useToggleWorkspacePinned();

  return (
    <div className="flex items-center gap-1">
      <PinButton
        isPinned={workspace.isPinned}
        pinLabel={t('page.pin')}
        unpinLabel={t('page.unpin')}
        onToggle={() => togglePinned(workspace.id)}
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
