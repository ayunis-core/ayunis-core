import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  ChatHistory,
  ChatHistoryDeleteAction,
  ChatHistoryEmptyState,
  ChatHistoryEntry,
  ChatHistoryError,
  ChatHistoryLoading,
  ChatHistoryPagination,
} from '@ayunis/chat/history';
import {
  useContentScrollHeader,
  type ChatCapabilities,
} from '@ayunis/chat/surface';
import type { GetThreadsResponseDtoItem } from '@ayunis/api-client/schemas';
import { PaneHeading } from '@/outlook/ui/PaneHeading';
import {
  PANE_HISTORY_PAGE_SIZE,
  usePaneHistory,
  usePaneThreadActions,
} from '@/outlook/lib/use-pane-chat-data';

interface PaneHistoryProps {
  readonly capabilities: ChatCapabilities;
  readonly onSelect: (id: string) => void;
  readonly onBack: () => void;
  readonly onSignOut: () => Promise<void>;
  readonly onError: (error: unknown) => void;
  readonly session: AbortSignal;
}

export function PaneChatHistory({
  capabilities,
  onSelect,
  onBack,
  onSignOut,
  onError,
  session,
}: PaneHistoryProps) {
  const { t } = useTranslation('chats');
  const { t: outlook } = useTranslation('outlook');
  const [offset, setOffset] = useState(0);
  const history = usePaneHistory(offset);
  const actions = usePaneThreadActions();
  const total = history.data?.pagination.total;
  if (total !== undefined && offset > 0 && offset >= total) {
    const lastPage = Math.floor(
      Math.max(total - 1, 0) / PANE_HISTORY_PAGE_SIZE,
    );
    setOffset(lastPage * PANE_HISTORY_PAGE_SIZE);
    return null;
  }
  const header = (
    <PaneHeading
      title={t('page.title')}
      actions={
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="embedded-back-to-start"
            onClick={onBack}
          >
            {t('page.embedded.backToStart')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="embedded-sign-out"
            onClick={() => {
              void onSignOut().catch(onError);
            }}
          >
            {t('page.embedded.signOut')}
          </Button>
        </div>
      }
    />
  );
  if (history.isError && !history.data) {
    return (
      <HistoryFrame header={header}>
        <ChatHistoryError
          message={outlook('chat.requestFailed')}
          retryLabel={outlook('chat.retry')}
          onRetry={() => {
            void history.refetch();
          }}
        />
      </HistoryFrame>
    );
  }
  if (history.isPending) {
    return (
      <HistoryFrame header={header}>
        <ChatHistoryLoading label={t('page.title')} />
      </HistoryFrame>
    );
  }

  const chats = history.data?.data ?? [];
  if (chats.length === 0 && offset === 0) {
    return (
      <div className="absolute inset-0 flex flex-col">
        <div className="outlook-page-header">{header}</div>
        <div className="flex min-h-0 w-full flex-1 overflow-y-auto">
          <div className="m-auto flex w-full justify-center pb-20">
            <EmptyHistory onBack={onBack} />
          </div>
        </div>
      </div>
    );
  }
  const currentPage = offset / PANE_HISTORY_PAGE_SIZE + 1;
  const totalPages =
    total === undefined
      ? currentPage + Number(chats.length === PANE_HISTORY_PAGE_SIZE)
      : Math.ceil(total / PANE_HISTORY_PAGE_SIZE);
  return (
    <HistoryFrame header={header}>
      <ChatHistory
        chats={chats}
        renderChat={(chat) => (
          <HistoryCard
            chat={chat}
            select={() => onSelect(chat.id)}
            remove={
              capabilities.delete && actions.remove
                ? () => actions.remove(chat.id, session)
                : undefined
            }
            onError={onError}
          />
        )}
        empty={<EmptyHistory onBack={onBack} />}
        pagination={
          <ChatHistoryPagination
            currentPage={currentPage}
            totalPages={totalPages}
            testIdPrefix="outlook-history"
            onPage={(page) => setOffset((page - 1) * PANE_HISTORY_PAGE_SIZE)}
          />
        }
      />
    </HistoryFrame>
  );
}

function HistoryFrame({
  header,
  children,
}: Readonly<{ header: ReactNode; children: ReactNode }>) {
  const { scrollRef, headerScrolled, onScroll } = useContentScrollHeader();
  return (
    <div className="absolute inset-0 flex min-h-0 flex-col pb-4">
      <div className="content-scroll-region relative flex min-h-0 flex-1 flex-col">
        <div
          ref={scrollRef}
          className="content-scroll-viewport min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto"
          onScroll={onScroll}
        >
          <div className="content-scroll-header-offset" aria-hidden />
          <div className="mx-auto w-full min-w-0 max-w-[800px] px-1 pb-3 sm:px-2">
            {children}
          </div>
        </div>
        <div
          className="content-scroll-header"
          data-scrolled={headerScrolled ? 'true' : 'false'}
        >
          {header}
        </div>
      </div>
    </div>
  );
}

function HistoryCard({
  chat,
  select,
  remove,
  onError,
}: Readonly<{
  chat: GetThreadsResponseDtoItem;
  select: () => void;
  remove?: () => Promise<void>;
  onError: (error: unknown) => void;
}>) {
  const { t } = useTranslation('chats');
  const [busy, setBusy] = useState(false);
  const untitled = t('card.untitled');
  return (
    <ChatHistoryEntry
      chat={chat}
      untitledLabel={untitled}
      anonymousLabel={t('card.anonymous')}
      renderTitle={(title, className) => (
        <a
          href={`#chat-${chat.id}`}
          className={className}
          data-testid="chat-card"
          onClick={(event) => {
            event.preventDefault();
            select();
          }}
        >
          {title}
        </a>
      )}
      actions={
        remove && (
          <>
            <ChatHistoryDeleteAction
              title={chat.title || untitled}
              busy={busy}
              dismissible={false}
              onDelete={() => {
                setBusy(true);
                void remove()
                  .catch(onError)
                  .finally(() => setBusy(false));
              }}
            />
          </>
        )
      }
    />
  );
}

function EmptyHistory({ onBack }: Readonly<{ onBack: () => void }>) {
  const { t } = useTranslation('chats');
  return (
    <ChatHistoryEmptyState
      title={t('emptyState.title')}
      description={t('emptyState.description')}
      action={
        <Button type="button" onClick={onBack}>
          <MessageCircle />
          {t('emptyState.startChat')}
        </Button>
      }
    />
  );
}
