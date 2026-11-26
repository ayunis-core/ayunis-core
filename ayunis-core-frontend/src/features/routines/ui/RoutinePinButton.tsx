import { useTranslation } from 'react-i18next';
import { PinButton } from '@/shared/ui/pin-button';
import {
  isFavorite,
  useFavorites,
  useToggleFavorite,
} from '@/features/favorites';

export function RoutinePinButton({
  routineId,
}: Readonly<{ routineId: string }>) {
  const { t } = useTranslation('routines');
  const { favorites } = useFavorites();
  const { toggle } = useToggleFavorite();
  const isPinned = isFavorite(favorites, routineId, 'routine');

  return (
    <PinButton
      isPinned={isPinned}
      pinLabel={t('card.pin')}
      unpinLabel={t('card.unpin')}
      onToggle={() => toggle('routine', routineId)}
    />
  );
}
