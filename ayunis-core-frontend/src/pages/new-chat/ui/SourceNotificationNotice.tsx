import { Link } from '@tanstack/react-router';
import { Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { NotificationResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface SourceNotificationNoticeProps {
  notification: Pick<NotificationResponseDto, 'id' | 'headline'>;
}

/** Names the notification a "Chat about this" chat is started about. */
export function SourceNotificationNotice({
  notification,
}: Readonly<SourceNotificationNoticeProps>) {
  const { t } = useTranslation('chat');
  return (
    <div
      className="mb-2 flex min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-sm"
      data-testid="new-chat-source-notification"
    >
      <Inbox className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="shrink-0 text-muted-foreground">
        {t('newChat.aboutNotification')}
      </span>
      <Link
        to="/inbox/$notificationId"
        params={{ notificationId: notification.id }}
        className="truncate font-medium hover:underline"
      >
        {notification.headline}
      </Link>
    </div>
  );
}
