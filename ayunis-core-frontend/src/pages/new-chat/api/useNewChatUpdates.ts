import type { ChatProductUpdates } from '@ayunis/chat/surface';
import { useIsFeatureEnabled } from '@/features/feature-toggles';
import { useUnreadNotificationCount } from '@/features/notifications';
import { useUnreadReleaseNoteCount } from '@/features/release-notes';

/** The unread counts the new chat shows under its composer. */
export function useNewChatUpdates(): ChatProductUpdates {
  const { unreadByType } = useUnreadNotificationCount();
  const { unreadCount } = useUnreadReleaseNoteCount();
  const releaseNotesEnabled = useIsFeatureEnabled('releaseNotesEnabled');
  return {
    notifications: unreadByType,
    releaseNotes: releaseNotesEnabled ? unreadCount : undefined,
  };
}
