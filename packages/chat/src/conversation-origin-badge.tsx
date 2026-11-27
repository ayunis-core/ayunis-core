import { useTranslation } from 'react-i18next';
import { Inbox, Megaphone } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import type { GetThreadResponseDto } from '@ayunis/api-client/schemas';
import type { ChatEvents } from './chat-config';
import { ChatLink } from './chat-link';
import { useChatFeature } from './use-chat-feature';

/** Leads back to the notification or product update a chat was started about. */
export function OriginBadge({
  origin,
  events,
}: Readonly<{ origin?: GetThreadResponseDto['origin']; events: ChatEvents }>) {
  const { t } = useTranslation('chat');
  const routinesEnabled = useChatFeature('routinesEnabled');
  const releaseNotesEnabled = useChatFeature('releaseNotesEnabled');
  const releaseNoteId =
    origin?.kind === 'release_note' ? origin.releaseNoteId : null;
  const notificationId =
    origin?.kind === 'notification' ? origin.notificationId : null;
  if (!events.onNavigate) return null;
  if (releaseNotesEnabled && releaseNoteId) {
    return (
      <Badge variant="outline" asChild>
        <ChatLink
          to={{ kind: 'releaseNote', releaseNoteId }}
          events={events}
          data-testid="chat-source-release-note"
        >
          <Megaphone className="h-3 w-3" />
          {t('chat.fromReleaseNote')}
        </ChatLink>
      </Badge>
    );
  }
  if (routinesEnabled && notificationId) {
    return (
      <Badge variant="outline" asChild>
        <ChatLink
          to={{ kind: 'notification', notificationId }}
          events={events}
          data-testid="chat-source-notification"
        >
          <Inbox className="h-3 w-3" />
          {t('chat.fromNotification')}
        </ChatLink>
      </Badge>
    );
  }
  return null;
}
