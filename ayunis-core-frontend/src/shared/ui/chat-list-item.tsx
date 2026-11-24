import type { ComponentProps } from 'react';
import { Link } from '@tanstack/react-router';
import { ChatHistoryEntry } from '@ayunis/chat/history';

type ChatListItemProps = Omit<
  ComponentProps<typeof ChatHistoryEntry>,
  'renderTitle'
>;

export function ChatListItem(props: Readonly<ChatListItemProps>) {
  return (
    <ChatHistoryEntry
      {...props}
      renderTitle={(title, className) => (
        <Link
          to="/chats/$threadId"
          params={{ threadId: props.chat.id }}
          className={className}
        >
          {title}
        </Link>
      )}
    />
  );
}
