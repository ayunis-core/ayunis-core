import {
  NotificationMediaType,
  type NotificationMediaResponseDto,
} from '@ayunis/api-client/schemas';

interface NotificationMediaProps {
  media: NotificationMediaResponseDto | null;
  /** Where the image is served from when the media is an image. */
  imageSrc: string;
  title: string;
  testIdPrefix: string;
}

/** The image or Loom video of a notification or a release note. */
export function NotificationMedia({
  media,
  imageSrc,
  title,
  testIdPrefix,
}: Readonly<NotificationMediaProps>) {
  if (media?.type === NotificationMediaType.image) {
    return (
      <img
        src={imageSrc}
        alt={title}
        className="w-full rounded-lg border"
        data-testid={`${testIdPrefix}-image`}
      />
    );
  }
  if (media?.type === NotificationMediaType.loom && media.url) {
    return (
      <iframe
        src={media.url}
        title={title}
        className="aspect-video w-full rounded-lg border-0"
        allow="fullscreen; picture-in-picture"
        allowFullScreen
        loading="lazy"
        data-testid={`${testIdPrefix}-loom`}
      />
    );
  }
  return null;
}
