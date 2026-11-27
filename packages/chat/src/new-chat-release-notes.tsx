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
import type { ChatEvents } from './chat-config';
import { ChatLink } from './chat-link';
import { useUnreadReleaseNotes } from './new-chat/use-unread-release-notes';

type UpdateLinks = Pick<ChatEvents, 'onNavigate' | 'hrefFor'>;

/** A release note is dated by day; formatting it in UTC keeps the day. */
function formatReleaseNoteDate(date: string, language: string): string {
  return new Date(date).toLocaleDateString(language, {
    dateStyle: 'long',
    timeZone: 'UTC',
  });
}

export function UnreadReleaseNoteList({
  links,
}: Readonly<{ links: UpdateLinks }>) {
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
            links={links}
          />
        ))
      )}
      <ChatLink
        to={{ kind: 'releaseNotes' }}
        events={links}
        className="group flex items-center justify-center gap-1 rounded-md py-1.5 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        data-testid="new-chat-unread-release-notes-link"
      >
        {t('newChat.unreadNotifications.viewAllProductUpdates')}
        <ArrowRight
          className="size-3 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </ChatLink>
    </div>
  );
}

function UnreadReleaseNoteItem({
  releaseNote,
  index,
  links,
}: Readonly<{
  releaseNote: ReleaseNoteResponseDto;
  index: number;
  links: UpdateLinks;
}>) {
  const { i18n } = useTranslation();

  return (
    <Item asChild size="sm">
      <ChatLink
        className="unread-panel__row"
        style={{ animationDelay: `${80 + Math.min(index, 6) * 50}ms` }}
        to={{ kind: 'releaseNote', releaseNoteId: releaseNote.id }}
        events={links}
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
      </ChatLink>
    </Item>
  );
}
