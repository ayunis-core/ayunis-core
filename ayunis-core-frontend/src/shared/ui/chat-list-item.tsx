import type { MouseEventHandler, ReactNode } from 'react';
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
  onClick,
  testId,
}: Readonly<{
  chat: GetThreadsResponseDtoItem;
  untitledLabel: string;
  anonymousLabel: string;
  actions: ReactNode;
  onClick: MouseEventHandler<HTMLDivElement>;
  testId?: string;
}>) {
  const createdDate = new Date(chat.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Item
      variant="outline"
      className="cursor-pointer"
      data-testid={testId}
      onClick={onClick}
    >
      <ItemContent>
        <ItemTitle>
          <span>{chat.title || untitledLabel}</span>
          {chat.isAnonymous ? (
            <Badge variant="outline" className="ml-2 text-xs">
              {anonymousLabel}
            </Badge>
          ) : null}
        </ItemTitle>
        <ItemDescription>{createdDate}</ItemDescription>
      </ItemContent>
      <ItemActions onClick={(event) => event.stopPropagation()}>
        {actions}
      </ItemActions>
    </Item>
  );
}
