import { useEffect, useLayoutEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MessageCircle } from 'lucide-react';
import type { GetThreadsResponseDtoItem } from '@ayunis/api-client/schemas';
import { Button } from '@ayunis/ui/components/button';
import type { ChatFavorites, ChatViewConfig } from './chat-config';
import { HistoryRow } from './history-row';
import {
  chatHistoryPageCount,
  chatHistoryPageInRange,
  chatHistoryQuery,
} from './history-query';
import { ChatHistory } from './history/ChatHistory';
import { ChatHistoryPagination } from './history/ChatHistoryPagination';
import {
  ChatHistoryEmptyState,
  ChatHistoryError,
  ChatHistoryLoading,
} from './history/ChatHistoryStates';
import { createChatRunLifecycle, type ChatRunLifecycle } from './run-lifecycle';
import { useDeleteHistoryChat } from './use-thread-actions';

/** A page the host keeps, e.g. in its URL. */
export interface HistoryPagination {
  /** 1-based. */
  readonly page: number;
  readonly onPage: (page: number) => void;
}

export interface HistoryProps {
  readonly config: ChatViewConfig;
  readonly onSelect: (threadId: string) => void;
  /** Stops a deleted chat's run; the session's lifecycle, like `Conversation`'s. */
  readonly lifecycle?: ChatRunLifecycle;
  /** Lists only the chats whose title or content matches. */
  readonly search?: string;
  /** Without it, the history keeps its page itself. */
  readonly pagination?: HistoryPagination;
  /**
   * Whether the user has no chats at all, so the host can frame that as a
   * full-screen message instead of a list.
   */
  readonly onEmptyChange?: (empty: boolean) => void;
}

/**
 * The user's chats of the session's surface, a page at a time, each opening
 * through `onSelect`. The package loads them and handles deletion; pinning
 * and moving show when `favorites` and `workspaces` are passed.
 */
export function History(props: HistoryProps) {
  return <HistorySession key={props.config.sessionKey} {...props} />;
}

function HistorySession(props: HistoryProps) {
  const [ownedLifecycle] = useState(() =>
    createChatRunLifecycle(props.config.transport),
  );
  return (
    <HistoryPages
      key={props.search ?? ''}
      {...props}
      lifecycle={props.lifecycle ?? ownedLifecycle}
    />
  );
}

function useHistoryPage(pagination: HistoryPagination | undefined) {
  const [ownPage, setOwnPage] = useState(1);
  return pagination
    ? ([pagination.page, pagination.onPage] as const)
    : ([ownPage, setOwnPage] as const);
}

type PagesProps = HistoryProps & { readonly lifecycle: ChatRunLifecycle };

function HistoryPages(props: PagesProps) {
  const { search, onEmptyChange } = props;
  const [page, setPage] = useHistoryPage(props.pagination);
  const query = useQuery(chatHistoryQuery({ search, page }));
  const total = query.data?.pagination.total;
  const pageInRange = chatHistoryPageInRange(page, total);
  const empty = query.data?.data.length === 0 && page === 1 && !search;
  useEffect(() => {
    if (pageInRange !== page) setPage(pageInRange);
  }, [page, pageInRange, setPage]);
  useLayoutEffect(() => {
    onEmptyChange?.(empty);
  }, [empty, onEmptyChange]);

  if (query.isError && !query.data) {
    return <HistoryLoadError onRetry={() => void query.refetch()} />;
  }
  if (!query.data || pageInRange !== page) return <HistoryLoading />;
  return (
    <HistoryList
      {...props}
      chats={query.data.data}
      page={page}
      pageCount={chatHistoryPageCount(page, total, query.data.data.length)}
      onPage={setPage}
    />
  );
}

function HistoryLoading() {
  const { t } = useTranslation('chats');
  return <ChatHistoryLoading label={t('page.title')} />;
}

function HistoryLoadError({ onRetry }: Readonly<{ onRetry: () => void }>) {
  const { t } = useTranslation('chats');
  return (
    <ChatHistoryError
      message={t('history.loadFailed')}
      retryLabel={t('history.retry')}
      onRetry={onRetry}
    />
  );
}

type ListProps = PagesProps & {
  readonly chats: readonly GetThreadsResponseDtoItem[];
  readonly page: number;
  readonly pageCount: number;
  readonly onPage: (page: number) => void;
};

function HistoryList(props: ListProps) {
  const { config, lifecycle, chats } = props;
  const deletion = useDeleteHistoryChat(config, lifecycle);
  return (
    <ChatHistory
      chats={favoritesFirst(chats, config.favorites)}
      renderChat={(chat) => (
        <HistoryRow
          chat={chat}
          config={config}
          deleting={deletion.deletingId === chat.id}
          onSelect={props.onSelect}
          onDelete={deletion.deleteThread}
        />
      )}
      empty={
        <HistoryEmpty
          searching={Boolean(props.search)}
          onNewChat={config.events.onNewChat}
        />
      }
      pagination={
        <ChatHistoryPagination
          currentPage={props.page}
          totalPages={props.pageCount}
          onPage={props.onPage}
        />
      }
    />
  );
}

function favoritesFirst(
  chats: readonly GetThreadsResponseDtoItem[],
  favorites: ChatFavorites | undefined,
): readonly GetThreadsResponseDtoItem[] {
  if (!favorites) return chats;
  return [
    ...chats.filter(({ id }) => favorites.isFavorite(id)),
    ...chats.filter(({ id }) => !favorites.isFavorite(id)),
  ];
}

function HistoryEmpty({
  searching,
  onNewChat,
}: Readonly<{ searching: boolean; onNewChat: () => void }>) {
  const { t } = useTranslation('chats');
  if (searching) {
    return (
      <ChatHistoryEmptyState
        title={t('emptyState.noResultsTitle')}
        description={t('emptyState.noResultsDescription')}
      />
    );
  }
  return (
    <ChatHistoryEmptyState
      title={t('emptyState.title')}
      description={t('emptyState.description')}
      action={
        <Button type="button" onClick={onNewChat}>
          <MessageCircle />
          {t('emptyState.startChat')}
        </Button>
      }
    />
  );
}
