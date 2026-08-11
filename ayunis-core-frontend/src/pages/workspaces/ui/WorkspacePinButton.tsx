import { useTranslation } from 'react-i18next';
import { PinButton } from '@/shared/ui/pin-button';
import { useToggleWorkspacePinned } from '@/features/workspaces';

interface WorkspacePinButtonProps {
  workspaceId: string;
  isPinned: boolean;
}

export function WorkspacePinButton({
  workspaceId,
  isPinned,
}: Readonly<WorkspacePinButtonProps>) {
  const { t } = useTranslation('workspaces');
  const { mutate: togglePinned } = useToggleWorkspacePinned();

  return (
    <PinButton
      isPinned={isPinned}
      pinLabel={t('card.pin')}
      unpinLabel={t('card.unpin')}
      onToggle={() => togglePinned(workspaceId)}
    />
  );
}
