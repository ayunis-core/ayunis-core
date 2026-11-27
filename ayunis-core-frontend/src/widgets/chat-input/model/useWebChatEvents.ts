import { useNavigate } from '@tanstack/react-router';
import type { ChatEvents, ChatNavigationTarget } from '@ayunis/chat/surface';
import { showError } from '@/shared/lib/toast';

/** The Web address of a place the chat links to. */
export function webChatHref(target: ChatNavigationTarget): string {
  switch (target.kind) {
    case 'academy':
      return '/academy';
    case 'releaseNote':
      return `/news/${encodeURIComponent(target.releaseNoteId)}`;
    case 'notification':
      return `/inbox/${encodeURIComponent(target.notificationId)}`;
    case 'recording':
      return `/recordings/${encodeURIComponent(target.recordingId)}`;
    case 'path':
      return target.path;
  }
}

export function useWebChatEvents(): Pick<
  ChatEvents,
  'onNewChat' | 'onNavigate' | 'hrefFor' | 'onError'
> {
  const navigate = useNavigate();
  return {
    onNewChat: () => void navigate({ to: '/chat' }),
    onNavigate: (target) => void navigate({ href: webChatHref(target) }),
    hrefFor: webChatHref,
    onError: (error) =>
      showError(error instanceof Error ? error.message : String(error)),
  };
}
