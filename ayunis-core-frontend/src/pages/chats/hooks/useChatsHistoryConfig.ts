import { useRouter } from '@tanstack/react-router';
import type { ChatViewConfig } from '@ayunis/chat/surface';
import { threadRunEndpoints } from '@/features/chat-surface';
import {
  isFavorite,
  useFavorites,
  useToggleFavorite,
} from '@/features/favorites';
import { useWorkspaces } from '@/features/workspaces';
import { WEB_CHAT_DRAFTS, useWebChatEvents } from '@/widgets/chat-input';
import { useAssignThreadToWorkspace } from '@/widgets/chat-workspace-menu';

interface ChatsHistoryConfigOptions {
  readonly sessionKey: string;
  /** Opens the workspace creation, which files the chat there. */
  readonly onCreateWorkspace: (threadId: string) => void;
}

/** The Web data the package `History` shows: pinning and workspaces. */
export function useChatsHistoryConfig({
  sessionKey,
  onCreateWorkspace,
}: ChatsHistoryConfigOptions): ChatViewConfig {
  const router = useRouter();
  const { workspaces } = useWorkspaces();
  const { mutate: assignToWorkspace } = useAssignThreadToWorkspace();
  const { favorites } = useFavorites();
  const { toggle } = useToggleFavorite();
  return {
    sessionKey,
    transport: threadRunEndpoints,
    layout: 'page',
    drafts: WEB_CHAT_DRAFTS,
    workspaces: {
      items: workspaces,
      // The history starts no chat, so it has no workspace to select.
      selected: null,
      select: () => undefined,
      moveThread: (threadId, workspaceId) =>
        assignToWorkspace({ threadId, workspaceId }),
      create: (threadId) => {
        if (threadId) onCreateWorkspace(threadId);
      },
    },
    favorites: {
      isFavorite: (threadId) => isFavorite(favorites, threadId, 'thread'),
      toggle: (threadId) => toggle('thread', threadId),
    },
    events: {
      ...useWebChatEvents(),
      onThreadDeleted: () => void router.invalidate(),
    },
  };
}
