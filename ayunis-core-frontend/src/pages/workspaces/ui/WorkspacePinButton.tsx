import { useTranslation } from 'react-i18next';
import { PinButton } from '@/shared/ui/pin-button';
import {
  isFavorite,
  useFavorites,
  useToggleFavorite,
} from '@/features/favorites';
import type { TourTargetName } from '@/widgets/onboarding';

interface WorkspacePinButtonProps {
  workspaceId: string;
  tourTarget?: TourTargetName;
}

export function WorkspacePinButton({
  workspaceId,
  tourTarget,
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
      tourTarget={tourTarget}
    />
  );
}
