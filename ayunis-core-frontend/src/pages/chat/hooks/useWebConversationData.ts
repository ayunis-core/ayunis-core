import { useTranslation } from 'react-i18next';
import type {
  ChatFavorites,
  ChatTrailItem,
  ChatTrailThread,
  ChatWorkspaces,
} from '@ayunis/chat/surface';
import {
  isFavorite,
  useFavorites,
  useToggleFavorite,
} from '@/features/favorites';
import { useWorkspaces, type Workspace } from '@/features/workspaces';
import { useAssignThreadToWorkspace } from '@/widgets/chat-workspace-menu';

interface TrailLabels {
  readonly workspaces: string;
  readonly chats: string;
}

/** The Web breadcrumbs before a chat's title: its workspace or the chat list. */
export function webChatTrail(
  thread: ChatTrailThread,
  workspaces: readonly Workspace[],
  labels: TrailLabels,
): ChatTrailItem[] {
  const workspace = thread.workspaceId
    ? workspaces.find(({ id }) => id === thread.workspaceId)
    : undefined;
  if (!workspace) {
    return [{ label: labels.chats, target: { kind: 'path', path: '/chats' } }];
  }
  const workspacePath = `/workspaces/${workspace.id}`;
  return [
    {
      label: labels.workspaces,
      target: { kind: 'path', path: '/workspaces' },
    },
    { label: workspace.name, target: { kind: 'path', path: workspacePath } },
    {
      label: labels.chats,
      target: { kind: 'path', path: `${workspacePath}?tab=chats` },
    },
  ];
}

/** Workspaces, pinning and breadcrumbs: the Web data the conversation shows. */
export function useWebConversationData(
  thread: ChatTrailThread,
  onCreateWorkspace: (threadId: string) => void,
) {
  const { t } = useTranslation('chat');
  const { t: tWorkspace } = useTranslation('workspace');
  const { workspaces } = useWorkspaces();
  const { mutate: assignToWorkspace } = useAssignThreadToWorkspace();
  const { favorites } = useFavorites();
  const { toggle } = useToggleFavorite();
  const labels = {
    workspaces: tWorkspace('page.breadcrumb'),
    chats: t('chat.chats'),
  };
  const trail = (thread: ChatTrailThread) =>
    webChatTrail(thread, workspaces, labels);
  const moveThread = (threadId: string, workspaceId: string | null) =>
    assignToWorkspace({ threadId, workspaceId });
  const workspaceData: ChatWorkspaces = {
    items: workspaces,
    selected: thread.workspaceId ?? null,
    select: (workspaceId) => moveThread(thread.id, workspaceId),
    moveThread,
    create: (threadId = thread.id) => onCreateWorkspace(threadId),
  };
  const favoriteData: ChatFavorites = {
    isFavorite: (threadId) => isFavorite(favorites, threadId, 'thread'),
    toggle: (threadId) => toggle('thread', threadId),
  };
  return { trail, workspaces: workspaceData, favorites: favoriteData };
}
