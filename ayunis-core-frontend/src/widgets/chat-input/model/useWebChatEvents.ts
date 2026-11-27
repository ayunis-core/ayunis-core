import { useNavigate } from '@tanstack/react-router';
import type { ChatEvents, ChatNavigationTarget } from '@ayunis/chat/surface';
import { showError } from '@/shared/lib/toast';

const NAVIGATION_ROUTES = {
  academy: '/academy',
} as const satisfies Record<ChatNavigationTarget['kind'], string>;

export function useWebChatEvents(): Pick<
  ChatEvents,
  'onNewChat' | 'onNavigate' | 'onError'
> {
  const navigate = useNavigate();
  return {
    onNewChat: () => void navigate({ to: '/chat' }),
    onNavigate: (target) =>
      void navigate({ to: NAVIGATION_ROUTES[target.kind] }),
    onError: (error) =>
      showError(error instanceof Error ? error.message : String(error)),
  };
}
