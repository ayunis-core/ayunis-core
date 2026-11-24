import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Megaphone, Play } from 'lucide-react';
import {
  formatReleaseNoteDate,
  releaseNoteImageUrl,
  releaseNoteSummary,
} from '@/features/release-notes';
import {
  NotificationMediaType,
  type ReleaseNoteResponseDto,
} from '@ayunis/api-client/schemas';

interface ReleaseNoteListItemProps {
  releaseNote: ReleaseNoteResponseDto;
}

export function ReleaseNoteListItem({
  releaseNote,
}: Readonly<ReleaseNoteListItemProps>) {
  const { t, i18n } = useTranslation('release-notes');

  return (
    <li
      className="relative flex items-start gap-4 rounded-lg p-3 has-[a:hover]:bg-accent/50"
      data-testid="release-note-item"
      data-unread={releaseNote.unread}
    >
      <ReleaseNoteThumbnail releaseNote={releaseNote} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-xs text-muted-foreground">
          {t('list.kicker', {
            date: formatReleaseNoteDate(releaseNote.date, i18n.language),
          })}
        </p>
        <Link
          to="/news/$releaseNoteId"
          params={{ releaseNoteId: releaseNote.id }}
          className="font-medium outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50"
          data-testid="release-note-item-headline"
        >
          {releaseNote.headline}
        </Link>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {releaseNoteSummary(releaseNote.body)}
        </p>
      </div>
      {releaseNote.unread && (
        <span
          className="mt-1.5 size-2 shrink-0 rounded-full bg-brand"
          role="img"
          aria-label={t('list.unread')}
          data-testid="release-note-unread-dot"
        />
      )}
    </li>
  );
}

function ReleaseNoteThumbnail({
  releaseNote,
}: Readonly<ReleaseNoteListItemProps>) {
  const frame =
    'flex aspect-video w-32 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted text-muted-foreground sm:w-40';
  if (releaseNote.media?.type === NotificationMediaType.image) {
    return (
      <div className={frame}>
        <img
          src={releaseNoteImageUrl(releaseNote.id)}
          alt=""
          loading="lazy"
          className="size-full object-cover"
          data-testid="release-note-item-image"
        />
      </div>
    );
  }
  const Icon =
    releaseNote.media?.type === NotificationMediaType.loom ? Play : Megaphone;
  return (
    <div className={frame} data-testid="release-note-item-placeholder">
      <Icon className="size-6" aria-hidden />
    </div>
  );
}
