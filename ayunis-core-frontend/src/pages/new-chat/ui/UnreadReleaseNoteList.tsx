import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Megaphone } from 'lucide-react';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Skeleton } from '@ayunis/ui/components/skeleton';
import type { ReleaseNoteResponseDto } from '@ayunis/api-client/schemas';
import { formatReleaseNoteDate } from '@/features/release-notes';
import { useUnreadReleaseNotes } from '@/pages/new-chat/api/useUnreadReleaseNotes';

export function UnreadReleaseNoteList() {
  const { t } = useTranslation('chat');
  const { releaseNotes, isLoading } = useUnreadReleaseNotes();

  return (
    <div className="px-1.5 pb-1.5">
      {isLoading ? (
        <Skeleton className="my-1 h-16 w-full" />
      ) : (
        releaseNotes.map((releaseNote, index) => (
          <UnreadReleaseNoteItem
            key={releaseNote.id}
            releaseNote={releaseNote}
            index={index}
          />
        ))
      )}
      <Link
        to="/news"
        className="group flex items-center justify-center gap-1 rounded-md py-1.5 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        data-testid="new-chat-unread-release-notes-link"
      >
        {t('newChat.unreadNotifications.viewAllProductUpdates')}
        <ArrowRight
          className="size-3 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>
    </div>
  );
}

function UnreadReleaseNoteItem({
  releaseNote,
  index,
}: Readonly<{ releaseNote: ReleaseNoteResponseDto; index: number }>) {
  const { i18n } = useTranslation();

  return (
    <Item asChild size="sm">
      <Link
        className="unread-panel__row"
        style={{ animationDelay: `${80 + Math.min(index, 6) * 50}ms` }}
        to="/news/$releaseNoteId"
        params={{ releaseNoteId: releaseNote.id }}
        data-testid="new-chat-unread-release-note"
      >
        <ItemMedia variant="icon">
          <Megaphone className="text-muted-foreground" aria-hidden />
        </ItemMedia>
        <ItemContent className="min-w-0">
          <ItemTitle data-testid="new-chat-unread-release-note-headline">
            {releaseNote.headline}
          </ItemTitle>
          <ItemDescription>
            {formatReleaseNoteDate(releaseNote.date, i18n.language)}
          </ItemDescription>
        </ItemContent>
        <span className="size-2 shrink-0 rounded-full bg-brand" aria-hidden />
      </Link>
    </Item>
  );
}
