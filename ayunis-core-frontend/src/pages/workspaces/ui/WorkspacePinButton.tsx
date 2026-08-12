import { useTranslation } from 'react-i18next';
import { PinButton } from '@/shared/ui/pin-button';
import {
  isFavorite,
  useFavorites,
  useToggleFavorite,
} from '@/features/favorites';

interface WorkspacePinButtonProps {
  workspaceId: string;
}

export function WorkspacePinButton({
  workspaceId,
}: Readonly<WorkspacePinButtonProps>) {
  const { t } = useTranslation('workspaces');
  const { favorites } = useFavorites();
  const { toggle: togglePinned } = useToggleFavorite();
  const isPinned = isFavorite(favorites, workspaceId, 'workspace');

  return (
    <PinButton
      isPinned={isPinned}
      pinLabel={t('card.pin')}
      unpinLabel={t('card.unpin')}
      onToggle={() => togglePinned('workspace', workspaceId)}
    />
  );
}
