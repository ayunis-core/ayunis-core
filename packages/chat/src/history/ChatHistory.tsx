import { Fragment, type ReactNode } from 'react';

interface ChatHistoryProps<Row> {
  readonly chats: readonly Row[];
  readonly renderChat: (chat: Row) => ReactNode;
  readonly empty: ReactNode;
  readonly pagination?: ReactNode;
}

export function ChatHistory<Row extends { id: string }>({
  chats,
  renderChat,
  empty,
  pagination,
}: ChatHistoryProps<Row>) {
  return (
    <>
      {chats.length === 0 ? (
        empty
      ) : (
        <div className="space-y-3">
          {chats.map((chat) => (
            <Fragment key={chat.id}>{renderChat(chat)}</Fragment>
          ))}
        </div>
      )}
      {pagination}
    </>
  );
}
