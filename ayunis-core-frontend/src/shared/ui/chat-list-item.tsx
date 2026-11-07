import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { CalendarClock } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import type { GetThreadsResponseDtoItem } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export function ChatListItem({
  chat,
  untitledLabel,
  anonymousLabel,
  actions,
  testId,
}: Readonly<{
  chat: GetThreadsResponseDtoItem;
  untitledLabel: string;
  anonymousLabel: string;
  actions: ReactNode;
  testId?: string;
}>) {
  const createdDate = new Date(chat.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    // The link stretches over the whole row so the actions can sit above it
    // instead of being nested inside an anchor.
    <Item
      variant="outline"
      className="relative has-[a:hover]:bg-accent/50"
      data-testid={testId}
    >
      <ItemContent>
        <ItemTitle>
          {chat.type === 'routine' ? (
            <CalendarClock
              className="size-4 text-muted-foreground"
              data-testid="chat-routine-icon"
            />
          ) : null}
          <Link
            to="/chats/$threadId"
            params={{ threadId: chat.id }}
            className="outline-none after:absolute after:inset-0 after:rounded-md focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50"
          >
            {chat.title || untitledLabel}
          </Link>
          {chat.isAnonymous ? (
            <Badge variant="outline" className="ml-2 text-xs">
              {anonymousLabel}
            </Badge>
          ) : null}
        </ItemTitle>
        <ItemDescription>{createdDate}</ItemDescription>
      </ItemContent>
      <ItemActions className="relative z-10">{actions}</ItemActions>
    </Item>
  );
}
