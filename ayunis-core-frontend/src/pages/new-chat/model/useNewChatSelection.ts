import { useState } from 'react';
import type { ChatPinnedSkill } from '@ayunis/chat/surface';

/** The workspace and skill the new chat starts with. */
export function useNewChatSelection(initialWorkspaceId: string | undefined) {
  const [workspaceId, setWorkspaceId] = useState<string | null>(
    initialWorkspaceId ?? null,
  );
  const [skill, setSkill] = useState<ChatPinnedSkill>();
  return {
    workspaceId,
    skill,
    // A skill of another workspace no longer applies; other skills stay.
    selectWorkspace: (id: string | null) => {
      if (skill?.workspaceId && skill.workspaceId !== id) setSkill(undefined);
      setWorkspaceId(id);
    },
    toggleSkill: (picked: ChatPinnedSkill) =>
      setSkill((current) => (current?.id === picked.id ? undefined : picked)),
    clearSkill: () => setSkill(undefined),
  };
}
