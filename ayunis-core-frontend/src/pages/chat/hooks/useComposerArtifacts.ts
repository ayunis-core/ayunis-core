import { useEffect, useRef, useState } from 'react';
import { usePendingArtifacts } from '@/widgets/chat-input';
import { useAttachArtifacts } from '@/pages/chat/api/useAttachArtifacts';
import { useThreadArtifacts } from '@/pages/chat/api/useThreadArtifacts';
import type { Thread } from '@/pages/chat/model/openapi';

/**
 * The artifacts picked in an open chat's composer, linked on Send. The chat
 * page stays mounted when another chat opens, so everything is kept per chat.
 */
export function useComposerArtifacts(
  thread: Pick<Thread, 'id' | 'workspaceId' | 'isAnonymous'>,
) {
  const pending = usePendingArtifacts(
    { workspaceId: thread.workspaceId, isAnonymous: thread.isAnonymous },
    thread.id,
  );
  const { artifacts: linked } = useThreadArtifacts(thread.id);
  const attachArtifacts = useAttachArtifacts(thread.id);
  const [attachingThreadId, setAttachingThreadId] = useState<string | null>(
    null,
  );
  const openThreadIdRef = useRef(thread.id);
  useEffect(() => {
    openThreadIdRef.current = thread.id;
  }, [thread.id]);

  /** Resolves to false when one of them could not be linked. */
  async function attachPending(): Promise<boolean> {
    if (pending.artifacts.length === 0) return true;
    const threadId = thread.id;
    setAttachingThreadId(threadId);
    try {
      const attached = await attachArtifacts(
        pending.artifacts.map(({ id }) => id),
      );
      // Another chat's chips may be showing by now.
      if (attached && openThreadIdRef.current === threadId) pending.clear();
      return attached;
    } finally {
      setAttachingThreadId((current) =>
        current === threadId ? null : current,
      );
    }
  }

  return {
    isAttaching: attachingThreadId === thread.id,
    attachPending,
    composerProps: {
      artifacts: pending.artifacts,
      workspaceId: thread.workspaceId,
      onAddArtifact: pending.add,
      onRemoveArtifact: pending.remove,
      linkedArtifactIds: linked.map(({ id }) => id),
    },
  };
}
