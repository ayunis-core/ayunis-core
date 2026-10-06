import { PinButton } from '@/shared/ui/pin-button';
import {
  favoriteWorkspaceIdsOf,
  toggleFavoriteWorkspace,
  usePrototypeState,
} from '@/widgets/sharing-prototype/model/prototype-store';

export function WorkspaceFavoriteButton({
  workspaceId,
  personId,
}: Readonly<{ workspaceId: string; personId: string }>) {
  const state = usePrototypeState();
  return (
    <PinButton
      isPinned={favoriteWorkspaceIdsOf(state, personId).includes(workspaceId)}
      pinLabel="Zu Favoriten hinzufügen"
      unpinLabel="Aus Favoriten entfernen"
      onToggle={() => toggleFavoriteWorkspace(personId, workspaceId)}
    />
  );
}
