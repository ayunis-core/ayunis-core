import config from '@/shared/config';
import {
  NotificationMediaType,
  type NotificationResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface NotificationMediaProps {
  notification: NotificationResponseDto;
}

export function NotificationMedia({
  notification,
}: Readonly<NotificationMediaProps>) {
  const { media } = notification;
  if (media?.type === NotificationMediaType.image) {
    return (
      <img
        src={`${config.api.baseUrl}/notifications/${notification.id}/image`}
        alt={notification.headline}
        className="w-full rounded-lg border"
        data-testid="notification-detail-image"
      />
    );
  }
  if (media?.type === NotificationMediaType.loom && media.url) {
    return (
      <iframe
        src={media.url}
        title={notification.headline}
        className="aspect-video w-full rounded-lg border-0"
        allow="fullscreen; picture-in-picture"
        allowFullScreen
        loading="lazy"
        data-testid="notification-detail-loom"
      />
    );
  }
  return null;
}
