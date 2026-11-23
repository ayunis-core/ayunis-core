import { useState } from 'react';
import type {
  ArtifactScope,
  ArtifactSummary,
} from '@/shared/contexts/chat/chatContext';

interface PickedIn {
  scope: ArtifactScope;
  chatId?: string;
}

function samePlace(a: PickedIn, b: PickedIn): boolean {
  return (
    a.chatId === b.chatId &&
    a.scope.workspaceId === b.scope.workspaceId &&
    a.scope.isAnonymous === b.scope.isAnonymous
  );
}

/**
 * The artifacts picked in the composer and not sent yet. They belong to the
 * scope and the open chat (`chatId`) they were picked in, so they are dropped
 * when the chat about to be started moves to another workspace or mode, or
 * another chat opens in the same composer.
 */
export function usePendingArtifacts(scope: ArtifactScope, chatId?: string) {
  const [artifacts, setArtifacts] = useState<ArtifactSummary[]>([]);
  const [pickedIn, setPickedIn] = useState<PickedIn>({ scope, chatId });
  if (!samePlace({ scope, chatId }, pickedIn)) {
    setPickedIn({ scope, chatId });
    setArtifacts([]);
  }

  return {
    artifacts,
    add: (artifact: ArtifactSummary) =>
      setArtifacts((current) =>
        current.some(({ id }) => id === artifact.id)
          ? current
          : [...current, artifact],
      ),
    remove: (artifactId: string) =>
      setArtifacts((current) => current.filter(({ id }) => id !== artifactId)),
    clear: () => setArtifacts([]),
  };
}
